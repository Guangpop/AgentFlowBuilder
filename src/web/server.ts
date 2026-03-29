import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import chokidar from 'chokidar';
import { FileManager } from '../mcp/fileManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startWebServer(port: number = 3000) {
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

  // Serve static web app
  const webAppDir = path.resolve(__dirname, '../web-app');
  if (fs.existsSync(webAppDir)) {
    app.use(express.static(webAppDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webAppDir, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`AgentFlow Builder running at http://localhost:${port}`);
    console.log(`Workflows directory: ${fm.getDir()}`);
    import('open').then(({ default: open }) => open(`http://localhost:${port}`)).catch(() => {
      console.log('Could not open browser automatically. Please open the URL manually.');
    });
  });
}
