// src/shared/workflowMjsSerialize.ts
import { Workflow, WorkflowNode, NodeType } from './types.js';
import { FormatWarning, makeWarning } from './formatWarning.js';

export interface MjsSerializeResult { code: string; warnings: FormatWarning[]; }

function jsString(s: string): string { return JSON.stringify(s ?? ''); }

function safeVar(id: string): string {
  const v = (id || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(v) ? `n_${v}` : v;
}

function oneLine(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** Kahn topological order; nodes left in cycles are appended in input order. */
function topoOrder(nodes: WorkflowNode[]): WorkflowNode[] {
  const byId = new Map(nodes.map((n) => [n.node_id, n]));
  const indeg = new Map(nodes.map((n) => [n.node_id, 0]));
  for (const n of nodes) for (const t of n.next) if (indeg.has(t)) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const queue = nodes.filter((n) => (indeg.get(n.node_id) ?? 0) === 0).map((n) => n.node_id);
  const seen = new Set<string>();
  const ordered: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
    for (const t of byId.get(id)!.next) {
      if (!indeg.has(t)) continue;
      indeg.set(t, (indeg.get(t) ?? 0) - 1);
      if ((indeg.get(t) ?? 0) <= 0 && !seen.has(t)) queue.push(t);
    }
  }
  for (const n of nodes) if (!seen.has(n.node_id)) ordered.push(n.node_id);
  return ordered.map((id) => byId.get(id)!);
}

function promptFor(n: WorkflowNode): string {
  let p = n.description || n.title || n.node_id;
  if (n.node_type === NodeType.AgentSkill && n.config?.skill) p += `\n(Use skill: ${n.config.skill})`;
  if (n.node_type === NodeType.MCPTool && n.config?.tool) p += `\n(Use MCP tool: ${n.config.tool})`;
  return p;
}

/**
 * Approximate-only export: graph → a valid Claude Code workflow .mjs scaffold.
 * Control flow is LINEARIZED (topological order). Conditions become classifier
 * agents whose branch targets are documented as comments; cycles are noted as
 * comments. Every node is emitted exactly once → no duplication/skip. The
 * emitted `meta` is a pure literal by construction (no acorn needed).
 */
export function serializeWorkflowMjs(workflow: Workflow): MjsSerializeResult {
  const warnings: FormatWarning[] = [];
  const ordered = topoOrder(workflow.nodes);
  const usedVars = new Set<string>();
  const varMap = new Map<string, string>();
  const v = (id: string): string => {
    const cached = varMap.get(id);
    if (cached) return cached;
    const base = safeVar(id);
    let name = base;
    let i = 1;
    while (usedVars.has(name)) name = `${base}_${i++}`;
    usedVars.add(name);
    varMap.set(id, name);
    return name;
  };

  const head =
    `export const meta = {\n` +
    `  name: ${jsString(workflow.name)},\n` +
    `  description: ${jsString(workflow.description)},\n` +
    `  phases: [{ title: 'Run' }],\n` +
    `};\n\n`;

  warnings.push(makeWarning('PHASE_INFERRED', 'info', "Graphs have no inherent phases; emitted a single 'Run' phase."));
  warnings.push(makeWarning('EXPORT_APPROXIMATION', 'warn', 'Control flow is linearized; branches/loops are classifier agents + comments, not executable branching.'));

  const lines: string[] = [`phase('Run');`, ''];
  for (const n of ordered) {
    switch (n.node_type) {
      case NodeType.UserInput:
        lines.push(`// [UserInput] ${oneLine(n.title || n.node_id)}: ${oneLine(n.description)}`);
        lines.push(`// (workflow input — supply via args)`);
        break;
      case NodeType.UserResponse:
        lines.push(`log(${jsString(oneLine(n.description) || (n.title ?? n.node_id))});`);
        break;
      case NodeType.Condition: {
        const [tId, fId] = n.next;
        lines.push(
          `const ${v(n.node_id)} = await agent(${jsString('Classify and answer true or false:\n' + (n.description || n.title || n.node_id))}, ` +
          `{ schema: { type: 'object', properties: { result: { type: 'boolean' } }, required: ['result'] } });`,
        );
        lines.push(`if (${v(n.node_id)}.result) {`);
        lines.push(`  // TRUE → ${tId ?? '(none)'}`);
        lines.push(`} else {`);
        lines.push(`  // FALSE → ${fId ?? '(none)'}`);
        lines.push(`}`);
        warnings.push(makeWarning('CONDITION_INFERRED', 'warn', `Condition "${n.node_id}" exported as a classifier agent; branch targets are comments.`, { nodeId: n.node_id }));
        break;
      }
      case NodeType.ScriptExecution:
        lines.push(`// [ScriptExecution] ${oneLine(n.title || n.node_id)}: ${oneLine(n.description)}`);
        lines.push(`// NOTE: the orchestrator cannot run scripts/shell directly; only agents can.`);
        warnings.push(makeWarning('EXPORT_APPROXIMATION', 'warn', `ScriptExecution "${n.node_id}" emitted as a comment.`, { nodeId: n.node_id }));
        break;
      case NodeType.AgentQuestion:
        lines.push(`const ${v(n.node_id)} = await agent(${jsString(promptFor(n))});`);
        warnings.push(makeWarning('EXPORT_APPROXIMATION', 'warn', `AgentQuestion "${n.node_id}": workflows cannot take mid-run user input; emitted as an agent prompt.`, { nodeId: n.node_id }));
        break;
      case NodeType.MCPTool:
        lines.push(`const ${v(n.node_id)} = await agent(${jsString(promptFor(n))});`);
        warnings.push(makeWarning('EXPORT_APPROXIMATION', 'warn', `MCPTool "${n.node_id}": tool use is delegated to an agent.`, { nodeId: n.node_id }));
        break;
      default: // AgentReasoning, AgentAction, AgentSkill
        lines.push(`const ${v(n.node_id)} = await agent(${jsString(promptFor(n))});`);
    }
    lines.push('');
  }

  return { code: head + lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', warnings };
}
