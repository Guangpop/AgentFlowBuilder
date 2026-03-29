import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { FileManager } from '../mcp/fileManager.js';
import { getPrompts, Language } from '../shared/prompts/index.js';
import { cleanWorkflowForExport } from '../shared/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startWebServer(port: number = 3000, dev: boolean = false) {
  const app = express();
  app.use(express.json());

  const fm = new FileManager();
  fm.ensureDir();

  // API: List workflows
  app.get('/api/list', (_req, res) => {
    try {
      res.json(fm.list());
    } catch (err) {
      res.status(500).json({ error: 'Failed to list workflows' });
    }
  });

  // API: Load workflow
  app.get('/api/load/:name', (req, res) => {
    try {
      const result = fm.load(req.params.name);
      res.json(result);
    } catch (err) {
      res.status(404).json({ error: `Workflow "${req.params.name}" not found` });
    }
  });

  // API: Save workflow
  app.post('/api/save', (req, res) => {
    const { name, workflow } = req.body;
    if (!name || !workflow) {
      return res.status(400).json({ error: 'name and workflow are required' });
    }
    try {
      const filePath = fm.save(name, workflow);
      res.json({ path: filePath, success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save workflow' });
    }
  });

  // API: Delete workflow
  app.delete('/api/delete/:name', (req, res) => {
    const deleted = fm.delete(req.params.name);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Workflow not found' });
    }
  });

  // API: Generate instructions via Claude CLI
  app.post('/api/generate-instructions', async (req, res) => {
    const { workflow, language, ide, outputType, workflowName } = req.body;
    if (!workflow || !ide || !outputType || !workflowName) {
      return res.status(400).json({ error: 'workflow, ide, outputType, and workflowName are required' });
    }

    const lang: Language = language || 'en';
    const prompts = getPrompts(lang);
    const workflowJson = JSON.stringify(cleanWorkflowForExport(workflow), null, 2);
    const instructionPrompt = prompts.agentInstructionsPrompt(workflowJson);

    // Build prefix from locale key mapping
    const prefixMap: Record<string, string> = {
      'claude:skills': req.body.prefix || '',
      'claude:commands': req.body.prefix || '',
      'antigravity:skills': req.body.prefix || '',
      'antigravity:workflows': req.body.prefix || '',
      'cursor:skills': req.body.prefix || '',
      'cursor:commands': req.body.prefix || '',
    };
    const prefix = req.body.prefix || '';
    const fullPrompt = prefix + instructionPrompt;

    // Determine output file path
    const safeName = workflowName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const filePathMap: Record<string, string> = {
      'claude:skills': `.claude/skills/${safeName}/SKILL.md`,
      'claude:commands': `.claude/commands/${safeName}.md`,
      'antigravity:skills': `.agent/skills/${safeName}/SKILL.md`,
      'antigravity:workflows': `.agent/workflows/${safeName}.md`,
      'cursor:skills': `.cursor/skills/${safeName}/SKILL.md`,
      'cursor:commands': `.cursor/commands/${safeName}.md`,
    };
    const outputRelPath = filePathMap[`${ide}:${outputType}`];
    if (!outputRelPath) {
      return res.status(400).json({ error: `Invalid ide:outputType combination: ${ide}:${outputType}` });
    }
    const outputPath = path.resolve(process.cwd(), outputRelPath);

    try {
      // Spawn claude CLI in print mode
      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn('claude', ['-p', fullPrompt], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        proc.on('close', (code: number | null) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(stderr || `claude CLI exited with code ${code}`));
          }
        });

        proc.on('error', (err: Error) => {
          reject(new Error(`Failed to spawn claude CLI: ${err.message}. Is Claude Code installed?`));
        });
      });

      // Ensure directory exists and write file
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, result, 'utf-8');

      res.json({ success: true, content: result, filePath: outputRelPath });
    } catch (err: any) {
      res.status(500).json({
        error: err.message || 'Failed to generate instructions',
        hint: 'Make sure Claude Code CLI is installed and accessible. You can also use "Copy Prompt" as a fallback.',
      });
    }
  });

  // SSE: Watch for file changes
  app.get('/api/watch', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const watcher = chokidar.watch(fm.getDir(), {
      ignoreInitial: true,
      depth: 0,
    });

    watcher.on('all', (event, filePath) => {
      if (filePath.endsWith('.json')) {
        const name = path.basename(filePath, '.json');
        res.write(`data: ${JSON.stringify({ event, name, path: filePath })}\n\n`);
      }
    });

    req.on('close', () => {
      watcher.close();
    });
  });

  // Serve web app
  if (dev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../../src/web-app'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const webAppDir = path.resolve(__dirname, '../web-app');
    if (fs.existsSync(webAppDir)) {
      app.use(express.static(webAppDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(webAppDir, 'index.html'));
      });
    }
  }

  app.listen(port, () => {
    console.log(`AgentFlow Builder running at http://localhost:${port}`);
    console.log(`Workflows directory: ${fm.getDir()}`);
    import('open').then(({ default: open }) => open(`http://localhost:${port}`)).catch(() => {
      console.log('Could not open browser automatically. Please open the URL manually.');
    });
  });
}
