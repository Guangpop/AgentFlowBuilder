import { Workflow, WorkflowNode, NodeType } from './types.js';
import { slugifyId } from './postProcess.js';

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  tags: string[];
  source: string;
}

/**
 * Convert a workflow name to kebab-case skill name.
 * Handles CJK characters by transliterating to pinyin-like slugs.
 */
export function generateSkillName(workflowName: string): string {
  // First try direct ASCII conversion
  let slug = workflowName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3400-\u4dbf\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // If result is only CJK (no ASCII), use underscore-joined node-id style
  if (slug && !/[a-z0-9]/.test(slug)) {
    slug = slug.replace(/[^a-z0-9]/g, '') || workflowName.trim().replace(/\s+/g, '_');
  }

  // Fallback: use slugifyId for pure CJK names
  if (!slug || !/[a-z0-9]/.test(slug)) {
    slug = slugifyId(workflowName);
  }

  // Final cleanup: ensure kebab-case
  return slug.replace(/_/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'unnamed-skill';
}

/**
 * Topologically sort workflow nodes by following `next` chains from entry nodes.
 */
export function topologicalSort(nodes: WorkflowNode[]): WorkflowNode[] {
  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    nodeMap.set(node.node_id, node);
  }

  // Find all node IDs referenced as a next target
  const referenced = new Set<string>();
  for (const node of nodes) {
    for (const nextId of node.next) {
      referenced.add(nextId);
    }
  }

  // Entry nodes: not referenced by any other node's next
  const entryNodes = nodes.filter(n => !referenced.has(n.node_id));
  if (entryNodes.length === 0 && nodes.length > 0) {
    // Fallback: use the first node
    entryNodes.push(nodes[0]);
  }

  const ordered: WorkflowNode[] = [];
  const visited = new Set<string>();
  const queue: string[] = entryNodes.map(n => n.node_id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodeMap.get(id);
    if (!node) continue;

    ordered.push(node);

    for (const nextId of node.next) {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  // Append any unreachable nodes at the end
  for (const node of nodes) {
    if (!visited.has(node.node_id)) {
      ordered.push(node);
    }
  }

  return ordered;
}

/**
 * Convert a workflow into a SKILL.md format string.
 * @param nameOverride - Optional ASCII skill name. If omitted, derived from workflow.name.
 */
export function workflowToSkillMd(workflow: Workflow, lang: 'en' | 'zh-TW' = 'en', nameOverride?: string): string {
  const sorted = topologicalSort(workflow.nodes);
  const topoIndex = new Map<string, number>();
  sorted.forEach((node, i) => topoIndex.set(node.node_id, i));

  const skillName = nameOverride ? generateSkillName(nameOverride) : generateSkillName(workflow.name);

  // Build keyword hints from first 3 node descriptions
  const keywords = sorted
    .slice(0, 3)
    .map(n => n.description)
    .filter(Boolean)
    .join(', ');

  // --- YAML frontmatter ---
  let descriptionBlock = `Use this skill when ${workflow.description}. Triggers on keywords: ${keywords}.`;
  if (lang === 'zh-TW') {
    descriptionBlock += `\n  ${workflow.description}`;
  }

  const lines: string[] = [];
  lines.push('---');
  lines.push(`name: ${skillName}`);
  lines.push('description: |');
  lines.push(`  ${descriptionBlock}`);
  lines.push('tags: [agentflow-generated]');
  lines.push('source: AgentFlow Builder');
  lines.push('version: "1.0.0"');
  lines.push('---');
  lines.push('');

  // --- Role Definition ---
  lines.push('# Role Definition');
  lines.push('');
  lines.push(workflow.description);
  lines.push('');

  // --- SOP ---
  lines.push('# Standard Operating Procedure (SOP)');
  lines.push('');

  sorted.forEach((node, i) => {
    const step = i + 1;
    lines.push(`## Stage ${step}: ${node.description}`);
    lines.push('');
    lines.push(`- **Type:** ${node.node_type}`);
    lines.push(`- **Inputs:** ${node.inputs.length > 0 ? node.inputs.join(', ') : 'none'}`);
    lines.push(`- **Expected Output:** ${node.outputs.length > 0 ? node.outputs.join(', ') : 'none'}`);
    lines.push('');
  });

  // --- Skill Modules ---
  const moduleNodes = sorted.filter(n =>
    n.node_type === NodeType.ScriptExecution ||
    n.node_type === NodeType.MCPTool ||
    n.node_type === NodeType.AgentSkill ||
    n.node_type === NodeType.Condition
  );

  if (moduleNodes.length > 0) {
    lines.push('# Skill Modules');
    lines.push('');

    for (const node of moduleNodes) {
      const config = node.config || {};

      if (node.node_type === NodeType.ScriptExecution) {
        lines.push(`## ${node.description} (ScriptExecution)`);
        lines.push('');
        lines.push(`- **Script Type:** ${config.scriptType || config.script_type || 'unknown'}`);
        if (config.content || config.script) {
          lines.push('');
          lines.push('```');
          lines.push(config.content || config.script);
          lines.push('```');
        }
        lines.push('');
      } else if (node.node_type === NodeType.MCPTool) {
        lines.push(`## ${node.description} (MCPTool)`);
        lines.push('');
        lines.push(`- **Tool Name:** ${config.toolName || config.tool_name || 'unknown'}`);
        lines.push('');
      } else if (node.node_type === NodeType.AgentSkill) {
        const provider = config.provider || 'unknown';
        const skill = config.skill || config.skillName || 'unknown';
        lines.push(`## ${node.description} (AgentSkill)`);
        lines.push('');
        lines.push(`- **Skill:** ${provider}:${skill}`);
        lines.push('');
      } else if (node.node_type === NodeType.Condition) {
        lines.push(`## ${node.description} (Condition)`);
        lines.push('');
        const trueTarget = node.next[0] || 'end';
        const falseTarget = node.next[1] || 'end';
        lines.push(`- **True branch** → ${trueTarget}`);
        lines.push(`- **False branch** → ${falseTarget}`);
        lines.push('');
      }
    }
  }

  // --- State Management ---
  const conditionNodes = sorted.filter(n => n.node_type === NodeType.Condition);
  const loopEdges: { from: string; to: string }[] = [];
  for (const node of sorted) {
    for (const nextId of node.next) {
      const fromIdx = topoIndex.get(node.node_id);
      const toIdx = topoIndex.get(nextId);
      if (fromIdx !== undefined && toIdx !== undefined && toIdx <= fromIdx) {
        loopEdges.push({ from: node.node_id, to: nextId });
      }
    }
  }

  if (conditionNodes.length > 0 || loopEdges.length > 0) {
    lines.push('# State Management');
    lines.push('');

    if (conditionNodes.length > 0) {
      lines.push('## Branching');
      lines.push('');
      for (const node of conditionNodes) {
        lines.push(`- **${node.node_id}**: ${node.description}`);
        lines.push(`  - True → ${node.next[0] || 'end'}`);
        lines.push(`  - False → ${node.next[1] || 'end'}`);
      }
      lines.push('');
    }

    if (loopEdges.length > 0) {
      lines.push('## Loops');
      lines.push('');
      for (const edge of loopEdges) {
        lines.push(`- ${edge.from} → ${edge.to} (loop back)`);
      }
      lines.push('');
    }
  }

  // --- Context Protocol ---
  lines.push('# Context Protocol');
  lines.push('');
  lines.push('- After each stage, summarize results and discard verbose intermediate output.');
  lines.push('- Retain critical context: user goals, key decisions, and accumulated state.');
  lines.push('- If conversation history exceeds manageable length, compact earlier stages into a summary.');
  lines.push('');

  return lines.join('\n');
}
