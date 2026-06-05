import * as fs from 'fs';
import * as path from 'path';
import { Workflow, WorkflowNode } from '../shared/types.js';
import { titleCase } from '../shared/workflowMd.js';
import {
  FormatId, parseByExtension, serializeByFormat, listFormats, effectivePriority, formatForExt,
} from '../shared/codecRegistry.js';

export class WorkflowNotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkflowNotFoundError'; }
}
export class WorkflowParseError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkflowParseError'; }
}

export interface LoadResult {
  workflow: Workflow;
  path: string;
  format: FormatId;
  candidates: Array<{ format: FormatId; path: string }>;
}
export interface SaveResult { path: string; format: FormatId; }
export interface ListEntry {
  name: string;
  path: string;            // selected file path (back-compat)
  selectedFormat: FormatId;
  formats: FormatId[];
  modified: string;
  nodeCount: number;
  description: string;
}

/**
 * Format-neutral workflow file I/O. JSON and MD are co-equal; JSON is the
 * default save format. The in-memory Workflow model is the single source of
 * truth; edges are never persisted (derived from next[] at load).
 */
export class FileManager {
  private workflowDir: string;
  private defaultFormat: FormatId;

  constructor(workflowDir?: string, opts?: { defaultFormat?: FormatId }) {
    this.workflowDir = workflowDir || path.join(process.cwd(), 'workflows');
    this.defaultFormat = opts?.defaultFormat ?? 'json';
  }

  ensureDir(): void {
    if (!fs.existsSync(this.workflowDir)) fs.mkdirSync(this.workflowDir, { recursive: true });
  }
  getDir(): string { return this.workflowDir; }

  private pathFor(name: string, format: FormatId): string {
    return path.join(this.workflowDir, `${sanitize(name)}.${format}`);
  }

  /** Existing on-disk variants for a basename, in registry format order. */
  private candidatesFor(name: string): Array<{ format: FormatId; path: string }> {
    return listFormats()
      .map((format) => ({ format, path: this.pathFor(name, format) }))
      .filter((c) => fs.existsSync(c.path));
  }

  save(name: string, workflow: Workflow, opts?: { format?: FormatId }): SaveResult {
    this.ensureDir();
    const normalized: Workflow = { ...workflow, nodes: workflow.nodes.map(ensureNodeTitle) };
    let format = opts?.format;
    if (!format) {
      const existing = this.candidatesFor(name);
      format = existing.length === 1 ? existing[0].format : this.defaultFormat;
    }
    const filePath = this.pathFor(name, format);
    fs.writeFileSync(filePath, serializeByFormat(normalized, format), 'utf-8');
    return { path: filePath, format };
  }

  load(ref: string): LoadResult {
    const parsed = path.parse(ref);
    // Explicit, KNOWN extension wins (e.g. "foo.md"). An unknown "extension"
    // (e.g. a workflow literally named "v1.2") is treated as part of a bare name.
    const explicitFormat = parsed.ext ? formatForExt(parsed.ext) : undefined;
    if (explicitFormat) {
      const filePath = this.pathFor(parsed.name, explicitFormat);
      if (!fs.existsSync(filePath)) throw new WorkflowNotFoundError(`Workflow "${ref}" not found at ${filePath}`);
      return this.readChosen(filePath, explicitFormat, [{ format: explicitFormat, path: filePath }]);
    }
    // Bare name → precedence derived from default.
    const candidates = this.candidatesFor(ref);
    if (candidates.length === 0) {
      throw new WorkflowNotFoundError(`Workflow "${ref}" not found in ${this.workflowDir}`);
    }
    const order = effectivePriority(this.defaultFormat);
    const chosen = order
      .map((f) => candidates.find((c) => c.format === f))
      .find((c): c is { format: FormatId; path: string } => Boolean(c))!;
    if (candidates.length > 1) {
      console.warn(
        `[agentflow] "${ref}" exists as ${candidates.map((c) => c.format).join(', ')}; ` +
        `loaded ${chosen.format} by precedence (default: ${this.defaultFormat}).`,
      );
    }
    return this.readChosen(chosen.path, chosen.format, candidates);
  }

  private readChosen(filePath: string, format: FormatId, candidates: Array<{ format: FormatId; path: string }>): LoadResult {
    const { workflow, warnings } = parseByExtension(filePath, fs.readFileSync(filePath, 'utf-8'));
    const fatal = warnings.find((w) => w.severity === 'error');
    if (fatal) throw new WorkflowParseError(`Failed to parse ${filePath}: ${fatal.message}`);
    return { workflow, path: filePath, format, candidates };
  }

  list(): ListEntry[] {
    this.ensureDir();
    const known = new Set(listFormats().map((f) => `.${f}`));
    const basenames = new Set<string>();
    for (const file of fs.readdirSync(this.workflowDir)) {
      const ext = path.extname(file).toLowerCase();
      if (known.has(ext)) basenames.add(path.basename(file, ext));
    }
    const order = effectivePriority(this.defaultFormat);
    const entries: ListEntry[] = [];
    for (const name of basenames) {
      const candidates = this.candidatesFor(name);
      if (candidates.length === 0) continue;
      const chosen = order
        .map((f) => candidates.find((c) => c.format === f))
        .find((c): c is { format: FormatId; path: string } => Boolean(c))!;
      const stats = fs.statSync(chosen.path);
      let nodeCount = 0;
      let description = '';
      try {
        const { workflow } = parseByExtension(chosen.path, fs.readFileSync(chosen.path, 'utf-8'));
        nodeCount = workflow.nodes.length;
        description = workflow.description || '';
      } catch {
        description = '(unreadable)';
      }
      entries.push({
        name,
        path: chosen.path,
        selectedFormat: chosen.format,
        formats: candidates.map((c) => c.format),
        modified: stats.mtime.toISOString(),
        nodeCount,
        description,
      });
    }
    return entries;
  }

  /** Delete one variant (if format given) or all variants. Returns deleted formats. */
  delete(name: string, format?: FormatId): { deleted: FormatId[] } {
    const targets = format
      ? this.candidatesFor(name).filter((c) => c.format === format)
      : this.candidatesFor(name);
    const deleted: FormatId[] = [];
    for (const c of targets) {
      fs.unlinkSync(c.path);
      deleted.push(c.format);
    }
    return { deleted };
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureNodeTitle(n: WorkflowNode): WorkflowNode {
  if (n.title && n.title.trim()) return n;
  return { ...n, title: titleCase(n.node_id) };
}
