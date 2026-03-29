import * as fs from 'fs';
import * as path from 'path';
import { Workflow } from '../shared/types.js';

export class FileManager {
  private workflowDir: string;

  constructor(workflowDir?: string) {
    this.workflowDir = workflowDir || path.join(process.cwd(), 'workflows');
  }

  ensureDir(): void {
    if (!fs.existsSync(this.workflowDir)) {
      fs.mkdirSync(this.workflowDir, { recursive: true });
    }
  }

  getWorkflowPath(name: string): string {
    // Sanitize name to prevent path traversal
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.workflowDir, `${safeName}.json`);
  }

  save(name: string, workflow: Workflow): string {
    this.ensureDir();
    const filePath = this.getWorkflowPath(name);
    fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
    return filePath;
  }

  load(name: string): { workflow: Workflow; path: string } {
    const filePath = this.getWorkflowPath(name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Workflow "${name}" not found at ${filePath}`);
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { workflow: data, path: filePath };
  }

  list(): Array<{ name: string; path: string; modified: string; nodeCount: number; description: string }> {
    this.ensureDir();
    const files = fs.readdirSync(this.workflowDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const filePath = path.join(this.workflowDir, file);
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
  }

  delete(name: string): boolean {
    const filePath = this.getWorkflowPath(name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  getDir(): string {
    return this.workflowDir;
  }
}
