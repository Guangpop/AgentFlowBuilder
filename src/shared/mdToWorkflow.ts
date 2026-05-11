import { Workflow, WorkflowNode, NodeType } from './types.js';

/**
 * Best-effort shaper: arbitrary markdown → AgentFlow workflow draft.
 *
 * Heuristics:
 *   - First H1 (or first non-empty line) → workflow.name
 *   - Paragraph after H1 → workflow.description
 *   - Each H2 → a node. Title = H2 text, description = body until next H2/H1.
 *   - Node type guessed from heading keywords (Condition / UserInput / etc.).
 *   - Linear `next` chain through H2 sections in order. Condition target inference
 *     is left to the user; we wire both branches to the next-next node so the
 *     canvas doesn't show dangling edges.
 *
 * The output is a *draft* — user is expected to refine on canvas.
 */
export interface ShapeResult {
  workflow: Workflow;
  warnings: string[];
}

interface TypeRule {
  type: NodeType;
  keywords: RegExp;
}

// English regex use \b for boundaries; CJK fallback patterns use plain substrings
// since \b doesn't sit between two non-ASCII chars in default JS regex.
const TYPE_RULES: TypeRule[] = [
  { type: NodeType.Condition, keywords: /\b(if|condition|decision)\b|分支|判斷|如果|是否/i },
  { type: NodeType.UserInput, keywords: /\b(user input|input from user|prompt user|ask the user)\b|使用者輸入|輸入/i },
  { type: NodeType.AgentQuestion, keywords: /\b(ask user|clarif)\b|釐清|提問|確認/i },
  { type: NodeType.UserResponse, keywords: /\b(user response|reply with|deliver)\b|回覆|回應/i },
  { type: NodeType.ScriptExecution, keywords: /\b(run script|run command)\b|腳本|執行程式/i },
  { type: NodeType.MCPTool, keywords: /\b(mcp|tool call|call api|invoke tool)\b/i },
  { type: NodeType.AgentSkill, keywords: /\b(skill|invoke skill)\b/i },
  { type: NodeType.AgentAction, keywords: /\b(perform|action|write)\b|執行|生成|產生/i },
];

function detectNodeType(title: string, body: string): NodeType {
  const probe = `${title}\n${body.slice(0, 200)}`;
  for (const rule of TYPE_RULES) {
    if (rule.keywords.test(probe)) return rule.type;
  }
  return NodeType.AgentReasoning;
}

function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s\-一-龥]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || fallback;
}

interface H2Section {
  title: string;
  body: string;
}

/**
 * Split markdown into H2 sections. Anything before the first H2 is preamble
 * (used for workflow name/description), not a node.
 */
function splitSections(md: string): { preamble: string; sections: H2Section[] } {
  const lines = md.split(/\r?\n/);
  const preamble: string[] = [];
  const sections: H2Section[] = [];
  let current: H2Section | null = null;
  let inPreamble = true;

  for (const line of lines) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      if (current) sections.push(current);
      current = { title: h2[1].trim(), body: '' };
      inPreamble = false;
      continue;
    }
    if (!inPreamble && /^#\s+/.test(line)) {
      if (current) sections.push(current);
      current = null;
      continue;
    }
    if (inPreamble) {
      preamble.push(line);
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  return { preamble: preamble.join('\n'), sections };
}

function extractH1AndDescription(preamble: string, fallbackName: string): { name: string; description: string } {
  const lines = preamble.split(/\r?\n/);
  let name = fallbackName;
  const descLines: string[] = [];
  let h1Seen = false;
  for (const line of lines) {
    const h1 = /^#\s+(.+?)\s*$/.exec(line);
    if (h1) {
      if (!h1Seen) {
        name = h1[1].trim();
        h1Seen = true;
      }
      continue;
    }
    if (h1Seen || !line.trim()) {
      descLines.push(line);
    }
  }
  return { name, description: descLines.join('\n').trim() };
}

export function shapeMdToWorkflow(md: string, fallbackName = 'Imported Workflow'): ShapeResult {
  const warnings: string[] = [];
  const { preamble, sections } = splitSections(md);
  const { name, description } = extractH1AndDescription(preamble, fallbackName);

  if (sections.length === 0) {
    warnings.push('No H2 headings detected. Created a single node holding all content. Refine on the canvas.');
    const node: WorkflowNode = {
      node_id: 'content',
      node_type: NodeType.AgentReasoning,
      title: name,
      description: preamble.trim() || md.trim() || description,
      inputs: [],
      outputs: [],
      next: [],
      position: { x: 250, y: 100 },
    };
    return {
      workflow: { name, description, nodes: [node], edges: [] },
      warnings,
    };
  }

  const usedIds = new Set<string>();
  const nodes: WorkflowNode[] = sections.map((sec, idx) => {
    const baseId = slugify(sec.title, `node_${idx + 1}`);
    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${baseId}_${++counter}`;
    }
    usedIds.add(id);
    const body = sec.body.trim();
    const nodeType = detectNodeType(sec.title, body);
    return {
      node_id: id,
      node_type: nodeType,
      title: sec.title,
      description: body,
      inputs: [],
      outputs: [],
      next: [],
      position: { x: 250, y: 100 + idx * 220 },
    };
  });

  for (let i = 0; i < nodes.length - 1; i++) {
    const next = nodes[i + 1].node_id;
    if (nodes[i].node_type === NodeType.Condition) {
      const falseTarget = nodes[i + 2]?.node_id || next;
      nodes[i].next = [next, falseTarget];
      warnings.push(
        `Stage ${i + 1} (${nodes[i].title}) detected as Condition. Both TRUE/FALSE branches wired forward — re-route on canvas.`
      );
    } else {
      nodes[i].next = [next];
    }
  }

  if (warnings.length === 0) {
    warnings.push(
      `Detected ${nodes.length} stages from H2 headings. Node types are guessed — review on canvas.`
    );
  }

  return {
    workflow: { name, description, nodes, edges: [] },
    warnings,
  };
}
