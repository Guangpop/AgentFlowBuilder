import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import chokidar from 'chokidar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startWebServer(port: number = 3000) {
  const app = express();
  app.use(express.json());

  const workflowDir = path.join(process.cwd(), 'workflows');

  // Ensure workflows directory exists
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }

  // API: List workflows
  app.get('/api/list', (req, res) => {
    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.json'));
    const workflows = files.map(file => {
      const filePath = path.join(workflowDir, file);
      const stats = fs.statSync(filePath);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
          name: path.basename(file, '.json'),
          path: filePath,
          modified: stats.mtime.toISOString(),
          nodeCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
          description: data.description || '',
        };
      } catch {
        return {
          name: path.basename(file, '.json'),
          path: filePath,
          modified: stats.mtime.toISOString(),
          nodeCount: 0,
          description: '(invalid JSON)',
        };
      }
    });
    res.json(workflows);
  });

  // API: Load workflow
  app.get('/api/load/:name', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(workflowDir, `${safeName}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Workflow "${req.params.name}" not found` });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ workflow: data, path: filePath });
  });

  // API: Save workflow
  app.post('/api/save', (req, res) => {
    const { name, workflow } = req.body;
    if (!name || !workflow) {
      return res.status(400).json({ error: 'name and workflow are required' });
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(workflowDir, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
    res.json({ path: filePath, success: true });
  });

  // API: Delete workflow
  app.delete('/api/delete/:name', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(workflowDir, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

    const watcher = chokidar.watch(workflowDir, {
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(webAppDir, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`AgentFlow Builder running at http://localhost:${port}`);
    console.log(`Workflows directory: ${workflowDir}`);
    // Try to open browser
    import('open').then(({ default: open }) => open(`http://localhost:${port}`)).catch(() => {});
  });
}
