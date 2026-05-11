import yaml from 'js-yaml';
import { NodeType, Workflow, WorkflowNode, NodePosition } from './types.js';
import { WorkflowZodSchema, formatZodError } from './workflowSchema.js';
import { ZodError } from 'zod';

export interface ParseResult {
  workflow: Workflow;
  warnings: string[];
}

export interface ParseOptions {
  /**
   * When true, warnings (orphan section, orphan node, missing/duplicate anchor)
   * are thrown as `WorkflowMdParseError` instead of being collected.
   * Use for CI / migration verification. Default false (lenient, for canvas runtime).
   */
  strict?: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const PROSE_LONG_THRESHOLD = 120;

export class WorkflowMdParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowMdParseError';
  }
}

export function parseWorkflowMd(content: string, opts: ParseOptions = {}): ParseResult {
  const warnings: string[] = [];

  const fmMatch = content.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw new WorkflowMdParseError('Not a workflow MD (missing YAML frontmatter)');
  }

  let fm: any;
  try {
    fm = yaml.load(fmMatch[1]);
  } catch (e: any) {
    throw new WorkflowMdParseError(`Invalid YAML frontmatter: ${e.message}`);
  }

  if (!fm || typeof fm !== 'object') {
    throw new WorkflowMdParseError('Frontmatter must be a YAML mapping');
  }
  if (typeof fm.name !== 'string' || !fm.name.trim()) {
    throw new WorkflowMdParseError('Frontmatter "name" is required');
  }
  if (!Array.isArray(fm.nodes)) {
    throw new WorkflowMdParseError('Frontmatter "nodes" must be an array');
  }

  const body = content.slice(fmMatch[0].length);
  const { workflowDescription, nodeSections } = parseBody(body);

  const seenIds = new Set<string>();
  const nodes: WorkflowNode[] = fm.nodes.map((rawNode: any, i: number) => {
    if (!rawNode || typeof rawNode !== 'object') {
      throw new WorkflowMdParseError(`nodes[${i}] is not an object`);
    }
    const id = rawNode.id;
    if (typeof id !== 'string' || !id.trim()) {
      throw new WorkflowMdParseError(`nodes[${i}].id is required`);
    }
    if (seenIds.has(id)) {
      throw new WorkflowMdParseError(`Duplicate node id: ${id}`);
    }
    seenIds.add(id);

    const type = rawNode.type;
    if (typeof type !== 'string' || !(Object.values(NodeType) as string[]).includes(type)) {
      throw new WorkflowMdParseError(`nodes[${i}].type "${type}" is not a valid NodeType`);
    }

    const next = normalizeNextOnParse(rawNode.next, id, type as NodeType);

    const section = nodeSections.get(id);
    if (!section) {
      warnings.push(`Frontmatter node "${id}" has no matching "## ... {#${id}}" section`);
    }

    const config: Record<string, any> = { ...(rawNode.config ?? {}) };
    if (section?.proseConfig) {
      for (const [k, v] of section.proseConfig) config[k] = v;
    }

    const position: NodePosition = isPosition(rawNode.position)
      ? { x: Number(rawNode.position.x), y: Number(rawNode.position.y) }
      : { x: 0, y: 0 };

    const node: WorkflowNode = {
      node_id: id,
      node_type: type as NodeType,
      title: typeof rawNode.title === 'string' ? rawNode.title : undefined,
      description: section?.body ?? '',
      inputs: Array.isArray(rawNode.inputs) ? rawNode.inputs.map(String) : [],
      outputs: Array.isArray(rawNode.outputs) ? rawNode.outputs.map(String) : [],
      next,
      position,
    };

    if (Object.keys(config).length > 0) {
      node.config = config;
    }

    return node;
  });

  for (const sectionId of nodeSections.keys()) {
    if (!seenIds.has(sectionId)) {
      warnings.push(`Prose section "{#${sectionId}}" has no matching frontmatter node`);
    }
  }

  if (opts.strict && warnings.length > 0) {
    throw new WorkflowMdParseError(
      `Strict mode parse failed with ${warnings.length} warning(s):\n  - ${warnings.join('\n  - ')}`
    );
  }

  const workflow: Workflow = {
    name: fm.name,
    description: workflowDescription,
    nodes,
    edges: [],
  };

  // Final schema validation. Surfaces any structural / type errors that slipped
  // past the manual parser checks.
  try {
    WorkflowZodSchema.parse(workflow);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new WorkflowMdParseError(`Schema validation failed: ${formatZodError(e)}`);
    }
    throw e;
  }

  return { workflow, warnings };
}

export function serializeWorkflowMd(workflow: Workflow): string {
  const fmNodes: any[] = [];
  const proseConfigPerNode: Array<{ key: string; value: string; fenceLang: string }[]> = [];

  for (const node of workflow.nodes) {
    const out: Record<string, any> = {
      id: node.node_id,
      type: node.node_type,
    };
    if (node.title) out.title = node.title;
    if (node.inputs && node.inputs.length > 0) out.inputs = [...node.inputs];
    if (node.outputs && node.outputs.length > 0) out.outputs = [...node.outputs];

    out.next = nextToFrontmatter(node);
    out.position = { x: node.position.x, y: node.position.y };

    const proseConfig: { key: string; value: string; fenceLang: string }[] = [];
    if (node.config && Object.keys(node.config).length > 0) {
      const shortConfig: Record<string, any> = {};
      for (const [k, v] of Object.entries(node.config)) {
        if (typeof v === 'string' && (v.length >= PROSE_LONG_THRESHOLD || v.includes('\n'))) {
          proseConfig.push({ key: k, value: v, fenceLang: '' });
        } else {
          shortConfig[k] = v;
        }
      }
      if (Object.keys(shortConfig).length > 0) {
        out.config = shortConfig;
      }
      // Resolve fence language for scriptContent based on scriptType
      for (const pc of proseConfig) {
        if (pc.key === 'scriptContent' && typeof shortConfig.scriptType === 'string') {
          pc.fenceLang = scriptTypeToFenceLang(shortConfig.scriptType);
        } else if (pc.key === 'script' && typeof shortConfig.language === 'string') {
          pc.fenceLang = scriptTypeToFenceLang(shortConfig.language);
        }
      }
    }
    proseConfigPerNode.push(proseConfig);
    fmNodes.push(out);
  }

  const yamlText = yaml.dump(
    { name: workflow.name, nodes: fmNodes },
    {
      lineWidth: -1,
      noRefs: true,
      flowLevel: 3,
      noCompatMode: true,
      quotingType: '"',
      forceQuotes: false,
    }
  );

  const lines: string[] = [];
  lines.push('---');
  lines.push(yamlText.trimEnd());
  lines.push('---');
  lines.push('');
  lines.push(`# ${workflow.name}`);
  if (workflow.description.trim().length > 0) {
    lines.push('');
    lines.push(workflow.description.trimEnd());
  }

  workflow.nodes.forEach((node, i) => {
    const heading = (node.title && node.title.trim()) || titleCase(node.node_id);
    lines.push('');
    lines.push(`## ${heading} {#${node.node_id}}`);
    if (node.description.trim().length > 0) {
      lines.push('');
      lines.push(node.description.trimEnd());
    }
    for (const pc of proseConfigPerNode[i]) {
      lines.push('');
      lines.push(`### config.${pc.key}`);
      lines.push('');
      lines.push('```' + pc.fenceLang);
      lines.push(pc.value);
      lines.push('```');
    }
  });

  return lines.join('\n') + '\n';
}

export function titleCase(s: string): string {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

interface NodeSection {
  title: string;
  body: string;
  proseConfig?: Map<string, string>;
}

function parseBody(body: string): {
  workflowDescription: string;
  nodeSections: Map<string, NodeSection>;
} {
  const lines = body.split(/\r?\n/);
  const nodeSections = new Map<string, NodeSection>();

  let mode: 'pre' | 'workflow' | 'node' | 'config' = 'pre';
  let workflowBodyLines: string[] = [];
  let currentId: string | null = null;
  let currentTitle = '';
  let currentBody: string[] = [];
  let currentProseConfig: Map<string, string> | null = null;
  let currentConfigKey: string | null = null;
  let currentConfigBody: string[] = [];
  let inFence = false;

  const flushConfigBlock = () => {
    if (currentConfigKey !== null) {
      if (!currentProseConfig) currentProseConfig = new Map();
      currentProseConfig.set(currentConfigKey, currentConfigBody.join('\n').replace(/\n+$/, ''));
      currentConfigKey = null;
      currentConfigBody = [];
      inFence = false;
    }
  };

  const flushNode = () => {
    if (currentId !== null) {
      flushConfigBlock();
      nodeSections.set(currentId, {
        title: currentTitle,
        body: currentBody.join('\n').trim(),
        proseConfig: currentProseConfig && currentProseConfig.size > 0 ? currentProseConfig : undefined,
      });
    }
    currentId = null;
    currentTitle = '';
    currentBody = [];
    currentProseConfig = null;
    currentConfigKey = null;
    currentConfigBody = [];
    inFence = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (mode === 'config') {
      if (inFence) {
        if (/^```/.test(line)) {
          // closing fence — collect block, return to node body
          flushConfigBlock();
          mode = 'node';
        } else {
          currentConfigBody.push(line);
        }
        continue;
      }
      if (/^```/.test(line)) {
        inFence = true;
        continue;
      }
      // Blank lines before fence are allowed; non-blank, non-fence ends config (no fence => empty value)
      if (line.trim() === '') continue;
      // Unexpected content under ### config.key — treat as plain body
      flushConfigBlock();
      mode = 'node';
      // fall through to re-process this line below
    }

    const h1 = line.match(/^#\s+(.+?)\s*$/);
    const h2 = line.match(/^##\s+(.+?)(?:\s*\{#([a-zA-Z0-9_-]+)\})?\s*$/);
    const h3 = line.match(/^###\s+config\.([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);

    if (h1) {
      // Workflow title heading. By this point mode is never 'config' (drained above).
      if (mode === 'node') flushNode();
      else if (mode === 'workflow') {
        // second H1 — unusual; treat as part of workflow body
        currentBody.push(line);
        continue;
      }
      mode = 'workflow';
      workflowBodyLines = [];
      currentBody = workflowBodyLines;
      continue;
    }

    if (h2) {
      if (mode === 'node') flushNode();
      // If mode is 'workflow' the description is already captured by reference
      const headingText = h2[1].trim();
      const explicitId = h2[2];
      const id = explicitId || slugify(headingText);
      mode = 'node';
      currentId = id;
      currentTitle = headingText;
      currentBody = [];
      currentProseConfig = null;
      continue;
    }

    if (h3 && mode === 'node') {
      // Start config block
      flushConfigBlock();
      currentConfigKey = h3[1];
      currentConfigBody = [];
      inFence = false;
      mode = 'config';
      continue;
    }

    if (mode === 'workflow' || mode === 'node') {
      currentBody.push(line);
    }
    // mode 'pre' before first heading — ignore
  }

  // Final flush
  if (mode === 'node' || mode === 'config') flushNode();

  return {
    workflowDescription: workflowBodyLines.join('\n').trim(),
    nodeSections,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isPosition(p: any): p is NodePosition {
  return p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number';
}

function normalizeNextOnParse(raw: unknown, nodeId: string, nodeType: NodeType): string[] {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw === 'object') {
    // Map form (for Condition or any explicit branching)
    const map = raw as Record<string, unknown>;
    if ('true' in map && 'false' in map) {
      return [String(map.true), String(map.false)];
    }
    throw new WorkflowMdParseError(
      `Node "${nodeId}" next is a mapping but missing required keys "true"/"false"`
    );
  }
  throw new WorkflowMdParseError(`Node "${nodeId}" next is invalid: ${JSON.stringify(raw)}`);
}

function nextToFrontmatter(node: WorkflowNode): any {
  if (node.node_type === NodeType.Condition && node.next.length === 2) {
    return { true: node.next[0], false: node.next[1] };
  }
  return [...node.next];
}

function scriptTypeToFenceLang(scriptType: string): string {
  const t = scriptType.toLowerCase();
  if (t === 'python') return 'python';
  if (t === 'shell' || t === 'bash' || t === 'sh') return 'bash';
  if (t === 'javascript' || t === 'js') return 'javascript';
  if (t === 'typescript' || t === 'ts') return 'typescript';
  return '';
}
