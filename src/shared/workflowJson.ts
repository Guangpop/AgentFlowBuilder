import { Workflow, WorkflowNode } from './types.js';
import { WorkflowZodSchema, formatZodError } from './workflowSchema.js';
import { titleCase } from './workflowMd.js';
import { FormatWarning, makeWarning } from './formatWarning.js';

export interface ParseOutcome {
  workflow: Workflow;
  warnings: FormatWarning[];
}

export type JsonShape = 'full' | 'clean';

/** Emit node keys in a fixed canonical order so output is deterministic. */
function orderNode(node: WorkflowNode, shape: JsonShape): Record<string, unknown> {
  const out: Record<string, unknown> = {
    node_id: node.node_id,
    node_type: node.node_type,
  };
  if (node.title !== undefined) out.title = node.title;
  out.description = node.description;
  out.inputs = node.inputs;
  out.outputs = node.outputs;
  if (node.config !== undefined) out.config = node.config;
  if (shape === 'full') out.position = node.position;
  out.next = node.next;
  return out;
}

/**
 * Canonical JSON serialization of the Workflow model.
 *  - `full` (default): includes node positions. Used for storage/roundtrip.
 *  - `clean`: strips positions. Used for sharing/export.
 * Edges are NEVER persisted — they are derived from each node's next[] at
 * load time (see CLAUDE.md), so they are always emitted as []. This makes
 * serialize->parse->serialize byte-stable regardless of in-memory edge state.
 * Keys are emitted in a fixed order with a trailing newline.
 */
export function serializeWorkflowJson(workflow: Workflow, opts: { shape?: JsonShape } = {}): string {
  const shape = opts.shape ?? 'full';
  const ordered = {
    name: workflow.name,
    description: workflow.description,
    nodes: workflow.nodes.map((n) => orderNode(n, shape)),
    edges: [] as never[],
  };
  return JSON.stringify(ordered, null, 2) + '\n';
}

function emptyWorkflow(name: string): Workflow {
  return { name, description: '', nodes: [], edges: [] };
}

/**
 * Normalize a raw parsed object into the Workflow shape, applying legacy
 * fixups: derive title from node_id, default empty arrays/position. Edges
 * preserved if present, else [].
 */
function normalizeWorkflow(raw: any): Workflow {
  return {
    name: raw?.name ?? '',
    description: raw?.description ?? '',
    nodes: (raw?.nodes ?? []).map((n: any): WorkflowNode => ({
      node_id: n.node_id,
      node_type: n.node_type,
      title: n.title || titleCase(n.node_id ?? ''),
      description: n.description ?? '',
      inputs: n.inputs ?? [],
      outputs: n.outputs ?? [],
      next: n.next ?? [],
      position: n.position ?? { x: 0, y: 0 },
      ...(n.config ? { config: n.config } : {}),
    })),
    edges: [], // edges are derived from next[] at runtime, never persisted (see CLAUDE.md)
  };
}

/**
 * Parse JSON text into a Workflow. Accepts a bare workflow object or a
 * `{ workflow }` / `{ confirmation, workflow }` wrapper. Never throws:
 * invalid JSON or schema-invalid input returns a best-effort workflow plus
 * a PARSE_FAILED warning.
 */
export function parseWorkflowJson(content: string): ParseOutcome {
  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch (err: any) {
    return {
      workflow: emptyWorkflow(''),
      warnings: [makeWarning('PARSE_FAILED', 'error', `Invalid JSON: ${err.message}`)],
    };
  }
  const obj =
    raw && typeof raw === 'object' && raw.workflow && typeof raw.workflow === 'object'
      ? raw.workflow
      : raw;
  const workflow = normalizeWorkflow(obj);
  const warnings: FormatWarning[] = [];
  const result = WorkflowZodSchema.safeParse(workflow);
  if (!result.success) {
    warnings.push(makeWarning('PARSE_FAILED', 'error', formatZodError(result.error)));
  }
  return { workflow, warnings };
}
