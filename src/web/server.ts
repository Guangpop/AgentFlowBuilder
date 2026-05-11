import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { FileManager } from '../mcp/fileManager.js';
import { shapeMdToWorkflow } from '../shared/mdToWorkflow.js';

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


  /**
   * Run markitdown on a local file or URL. Returns stdout (markdown) or throws
   * a user-readable error if Python or markitdown isn't installed.
   *
   * The user provides either an arbitrary URL or a tmpfile path we control —
   * neither is shell-interpolated (we use spawn(file, [args], no-shell)).
   */
  async function runMarkitdown(target: string): Promise<{ md: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('python3', ['-m', 'markitdown', target], { shell: false });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (c) => { stdout += c.toString(); });
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new Error('python3 not found on PATH. Install Python 3.10+ to import binary files / URLs.'));
        } else {
          reject(err);
        }
      });
      proc.on('close', (code) => {
        if (code !== 0) {
          if (/No module named markitdown/i.test(stderr)) {
            reject(new Error(`markitdown is not installed. Run:  pip install 'markitdown[all]'`));
            return;
          }
          reject(new Error(stderr.trim() || `markitdown exited with code ${code}`));
          return;
        }
        resolve({ md: stdout, stderr });
      });
    });
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
      fs.writeFileSync(tmpPath, req.body);
      const { md } = await runMarkitdown(tmpPath);
      const fallbackName = path.basename(filename, path.extname(filename)) || 'imported_file';
      const { workflow, warnings } = shapeMdToWorkflow(md, fallbackName);
      return res.json({ workflow, warnings, sourceMd: md });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'File import failed' });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* best-effort */ }
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
      let name: string | null = null;
      if (filePath.endsWith('.md')) {
        name = path.basename(filePath, '.md');
      } else if (filePath.endsWith('.json')) {
        name = path.basename(filePath, '.json');
      }
      if (name !== null) {
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
