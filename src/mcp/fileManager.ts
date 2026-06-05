import * as fs from 'fs';
import * as path from 'path';
import { Workflow, WorkflowNode } from '../shared/types.js';
import { parseWorkflowMd, serializeWorkflowMd, titleCase } from '../shared/workflowMd.js';
import { parseWorkflowJson } from '../shared/workflowJson.js';

/**
 * Workflow file I/O.
 * Canonical format is Markdown (`.md`) with YAML frontmatter + prose sections.
 * `.json` is read as a legacy fallback for workflows that haven't been migrated yet;
 * new saves always go to `.md`.
 */
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

  /** Path used for new writes (always .md). */
  getWorkflowPath(name: string): string {
    return path.join(this.workflowDir, `${sanitize(name)}.md`);
  }

  /** Legacy JSON path (only for reading old workflows). */
  getLegacyJsonPath(name: string): string {
    return path.join(this.workflowDir, `${sanitize(name)}.json`);
  }

  save(name: string, workflow: Workflow): string {
    this.ensureDir();
    // Ensure every node has a title (frontmatter requires it for display)
    const normalized: Workflow = {
      ...workflow,
      nodes: workflow.nodes.map(ensureNodeTitle),
    };
    const filePath = this.getWorkflowPath(name);
    fs.writeFileSync(filePath, serializeWorkflowMd(normalized), 'utf-8');
    return filePath;
  }

  load(name: string): { workflow: Workflow; path: string } {
    const mdPath = this.getWorkflowPath(name);
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const { workflow } = parseWorkflowMd(content);
      return { workflow, path: mdPath };
    }
    const jsonPath = this.getLegacyJsonPath(name);
    if (fs.existsSync(jsonPath)) {
      const { workflow, warnings } = parseWorkflowJson(fs.readFileSync(jsonPath, 'utf-8'));
      const fatal = warnings.find((w) => w.severity === 'error');
      if (fatal) {
        throw new Error(`Failed to parse ${jsonPath}: ${fatal.message}`);
      }
      return { workflow, path: jsonPath };
    }
    throw new Error(`Workflow "${name}" not found (looked at ${mdPath} and ${jsonPath})`);
  }

  list(): Array<{ name: string; path: string; modified: string; nodeCount: number; description: string }> {
    this.ensureDir();
    const files = fs.readdirSync(this.workflowDir);
    type Entry = { name: string; path: string; modified: string; nodeCount: number; description: string };
    const byName = new Map<string, { entry: Entry; isMd: boolean }>();

    for (const file of files) {
      const isMd = file.endsWith('.md');
      const isJson = file.endsWith('.json');
      if (!isMd && !isJson) continue;
      const basename = file.replace(/\.(md|json)$/, '');
      const filePath = path.join(this.workflowDir, file);
      const stats = fs.statSync(filePath);
      let nodeCount = 0;
      let description = '';
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (isMd) {
          const { workflow } = parseWorkflowMd(content);
          nodeCount = workflow.nodes.length;
          description = workflow.description || '';
        } else {
          const data = JSON.parse(content);
          nodeCount = Array.isArray(data.nodes) ? data.nodes.length : 0;
          description = data.description || '';
        }
      } catch {
        description = isMd ? '(invalid MD)' : '(invalid JSON)';
      }
      const entry: Entry = {
        name: basename,
        path: filePath,
        modified: stats.mtime.toISOString(),
        nodeCount,
        description,
      };
      const existing = byName.get(basename);
      if (!existing || (isMd && !existing.isMd)) {
        byName.set(basename, { entry, isMd });
      }
    }
    return Array.from(byName.values()).map((v) => v.entry);
  }

  delete(name: string): boolean {
    let deleted = false;
    const mdPath = this.getWorkflowPath(name);
    if (fs.existsSync(mdPath)) {
      fs.unlinkSync(mdPath);
      deleted = true;
    }
    const jsonPath = this.getLegacyJsonPath(name);
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
      deleted = true;
    }
    return deleted;
  }

  getDir(): string {
    return this.workflowDir;
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureNodeTitle(n: WorkflowNode): WorkflowNode {
  if (n.title && n.title.trim()) return n;
  return { ...n, title: titleCase(n.node_id) };
}

/**
 * Adapt a legacy `.json` workflow to the new shape:
 *  - Derive `title` from `node_id` (titleCase).
 *  - Strip stored `edges` (always derived at runtime).
 */
export function legacyJsonToWorkflow(raw: any): Workflow {
  return {
    name: raw.name,
    description: raw.description ?? '',
    nodes: (raw.nodes ?? []).map((n: any): WorkflowNode => ({
      node_id: n.node_id,
      node_type: n.node_type,
      title: n.title || titleCase(n.node_id),
      description: n.description ?? '',
      inputs: n.inputs ?? [],
      outputs: n.outputs ?? [],
      next: n.next ?? [],
      position: n.position ?? { x: 0, y: 0 },
      ...(n.config ? { config: n.config } : {}),
    })),
    edges: [],
  };
}
