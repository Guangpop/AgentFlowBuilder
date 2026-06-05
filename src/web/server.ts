import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { FileManager, WorkflowNotFoundError, WorkflowParseError } from '../mcp/fileManager.js';
import { shapeMdToWorkflow } from '../shared/mdToWorkflow.js';
import { listFormats } from '../shared/codecRegistry.js';
import { parseWorkflowMjs } from '../shared/workflowMjsParse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startWebServer(port: number = 3000, dev: boolean = false) {
  const app = express();
  app.use(express.json());

  const fm = new FileManager();
  fm.ensureDir();
  const ALLOWED_FORMATS = new Set<string>(listFormats());

  // API: Capabilities (feature flags + available formats)
  app.get('/api/capabilities', (_req, res) => {
    res.json({
      mjs: process.env.AGENTFLOW_MJS === '1',
      formats: ['json', 'md', ...(process.env.AGENTFLOW_MJS === '1' ? ['mjs'] : [])],
      defaultFormat: 'json',
    });
  });

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
      const { workflow, format, candidates } = fm.load(req.params.name);
      res.json({ workflow, format, formats: candidates.map((c) => c.format) });
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof WorkflowParseError) {
        return res.status(422).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to load workflow' });
    }
  });

  // API: Save workflow
  app.post('/api/save', (req, res) => {
    const { name, workflow, format } = req.body;
    if (!name || !workflow) {
      return res.status(400).json({ error: 'name and workflow are required' });
    }
    if (format !== undefined && !ALLOWED_FORMATS.has(format)) {
      return res.status(400).json({ error: `Unsupported format: ${format}. Use one of: ${[...ALLOWED_FORMATS].join(', ')}` });
    }
    try {
      const result = fm.save(name, workflow, format ? { format } : undefined);
      res.json({ path: result.path, format: result.format, success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save workflow' });
    }
  });

  // API: Delete workflow
  app.delete('/api/delete/:name', (req, res) => {
    const format = typeof req.query.format === 'string' ? req.query.format : undefined;
    if (format !== undefined && !ALLOWED_FORMATS.has(format)) {
      return res.status(400).json({ error: `Unsupported format: ${format}` });
    }
    try {
      const { deleted } = fm.delete(req.params.name, format as any);
      if (deleted.length > 0) {
        res.json({ success: true, deleted });
      } else {
        res.status(404).json({ error: 'Workflow not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  });


  /**
   * Run markitdown on a local file or URL. Tries the `markitdown` CLI first
   * (covers pipx / uv tool install / brew pip), falls back to
   * `python3 -m markitdown` (covers system / brew pip installs).
   *
   * Inputs come from req.body / req.headers; we use spawn(file, [args])
   * without shell so neither URL nor tmpfile path is shell-interpolated.
   */
  function spawnOnce(cmd: string, args: string[]): Promise<{ md: string; stderr: string; spawnError?: NodeJS.ErrnoException }> {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, { shell: false });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (c) => { stdout += c.toString(); });
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', (err: NodeJS.ErrnoException) => {
        resolve({ md: '', stderr: stderr || err.message, spawnError: err });
      });
      proc.on('close', (code) => {
        if (code !== 0 && !stdout) {
          resolve({ md: '', stderr: stderr || `exited with code ${code}` });
          return;
        }
        resolve({ md: stdout, stderr });
      });
    });
  }

  async function runMarkitdown(target: string): Promise<{ md: string; stderr: string }> {
    // Try the markitdown CLI (pipx/uv tool/brew pip all put it on PATH).
    const cli = await spawnOnce('markitdown', [target]);
    if (!cli.spawnError && cli.md) {
      return { md: cli.md, stderr: cli.stderr };
    }
    const cliMissing = cli.spawnError?.code === 'ENOENT';

    // Fallback: python3 -m markitdown
    const py = await spawnOnce('python3', ['-m', 'markitdown', target]);
    if (!py.spawnError && py.md) {
      return { md: py.md, stderr: py.stderr };
    }
    const pyMissing = py.spawnError?.code === 'ENOENT';

    // Both routes failed — craft a clear error.
    if (cliMissing && pyMissing) {
      throw new Error("Neither `markitdown` CLI nor `python3` was found on PATH. Install markitdown with:  uv tool install 'markitdown[all]'  (or pipx install).");
    }
    if (/No module named markitdown/i.test(py.stderr)) {
      throw new Error("markitdown is not installed. Install it with:  uv tool install 'markitdown[all]'  (or: pipx install 'markitdown[all]')");
    }
    const detail = (py.stderr || cli.stderr).trim();
    throw new Error(detail || 'markitdown failed');
  }

  // API: Import URL (JSON body parsed by the global express.json middleware)
  app.post('/api/import', async (req, res, next) => {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return next(); // fall through to the raw handler below
    }
    try {
      const url: string = req.body?.url;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url field is required' });
      }
      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: 'URL must start with http:// or https://' });
      }
      const { md } = await runMarkitdown(url);
      const fallbackName = url.replace(/^https?:\/\//, '').replace(/[^\w\-]+/g, '_').slice(0, 60) || 'imported_url';
      const { workflow, warnings } = shapeMdToWorkflow(md, fallbackName);
      return res.json({ workflow, warnings, sourceMd: md });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'URL import failed' });
    }
  });

  // API: Import file (raw binary body, filename in x-filename header)
  app.post('/api/import', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    const filename = decodeURIComponent((req.headers['x-filename'] as string) || 'upload.bin');
    const safeName = filename.replace(/[^\w.\-]/g, '_');
    const tmpPath = path.join(os.tmpdir(), `agentflow-import-${Date.now()}-${safeName}`);
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Empty body' });
      }
      if (filename.toLowerCase().endsWith('.mjs') && process.env.AGENTFLOW_MJS === '1') {
        const text = req.body.toString('utf-8');
        const fallbackName = path.basename(filename, path.extname(filename)) || 'imported_mjs';
        const { workflow, warnings } = parseWorkflowMjs(text, { fallbackName });
        return res.json({ workflow, warnings: warnings.map((w) => w.message), sourceMd: text });
      }
      fs.writeFileSync(tmpPath, req.body);
      const { md } = await runMarkitdown(tmpPath);
      const fallbackName = path.basename(filename, path.extname(filename)) || 'imported_file';
      const { workflow, warnings } = shapeMdToWorkflow(md, fallbackName);
      return res.json({ workflow, warnings, sourceMd: md });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'File import failed' });
    } finally {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* best-effort */ }
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
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.md' || ext === '.json' || ext === '.mjs') {
        const name = path.basename(filePath, ext);
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
      configFile: path.resolve(__dirname, '../../vite.config.ts'),
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
