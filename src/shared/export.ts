import { Workflow, WorkflowNode, Edge, NodeType } from './types.js';

/**
 * Sanitize free-text for use inside a Mermaid markdown-string label
 * (the `["` ... `"]` form). Mermaid's lexer breaks on:
 *  - backticks (close the markdown-string early)
 *  - double quotes (close the outer string literal)
 *  - raw newlines (\n is added explicitly elsewhere; embedded ones break parsing)
 *  - certain bracket combos that could be mistaken for shape syntax
 *
 * This is intentionally output-boundary sanitization — node descriptions
 * are markdown by design, so we don't strip markdown elsewhere; only here
 * where the syntax host is Mermaid.
 */
export function sanitizeMermaidLabel(text: string): string {
  if (!text) return '';
  return text
    .replace(/`/g, "'")              // backtick → apostrophe
    .replace(/"/g, '”')         // straight double-quote → right curly quote
    .replace(/\r\n|\r|\n/g, ' ')     // any line break → space
    .replace(/[\[\]{}]/g, ' ')       // bracket chars that confuse Mermaid shape syntax
    .replace(/\s+/g, ' ')            // collapse runs of whitespace
    .trim();
}

export function generateMermaid(workflow: Workflow): string {
  let content = "graph TD\n";
  // All 9 node types with distinct, warm colors
  content += "  classDef UserInput fill:#3b82f6,stroke:#2563eb,color:#fff,rx:8\n";
  content += "  classDef AgentReasoning fill:#8b5cf6,stroke:#7c3aed,color:#fff,rx:8\n";
  content += "  classDef Condition fill:#f59e0b,stroke:#d97706,color:#fff,rx:8\n";
  content += "  classDef AgentQuestion fill:#06b6d4,stroke:#0891b2,color:#fff,rx:8\n";
  content += "  classDef UserResponse fill:#14b8a6,stroke:#0d9488,color:#fff,rx:8\n";
  content += "  classDef AgentAction fill:#10b981,stroke:#059669,color:#fff,rx:8\n";
  content += "  classDef ScriptExecution fill:#f97316,stroke:#ea580c,color:#fff,rx:8\n";
  content += "  classDef MCPTool fill:#ec4899,stroke:#db2777,color:#fff,rx:8\n";
  content += "  classDef AgentSkill fill:#a855f7,stroke:#9333ea,color:#fff,rx:8\n";

  const nodeIds = new Set(workflow.nodes.map(n => n.node_id));

  workflow.nodes.forEach(node => {
    const safeId = node.node_id.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanDesc = sanitizeMermaidLabel(node.description || '');
    const truncatedDesc = cleanDesc.length > 40 ? `${cleanDesc.slice(0, 40)}...` : cleanDesc;
    const label = truncatedDesc
      ? `${node.node_id}\\n${truncatedDesc}`
      : node.node_id;

    // Use different shapes per node type
    switch (node.node_type) {
      case NodeType.UserInput:
        content += `  ${safeId}(["\`${label}\`"])\n`; // Stadium shape
        break;
      case NodeType.Condition:
        content += `  ${safeId}{{"\`${label}\`"}}\n`; // Hexagon
        break;
      case NodeType.ScriptExecution:
        content += `  ${safeId}[/"\`${label}\`"/]\n`; // Parallelogram
        break;
      default:
        content += `  ${safeId}["\`${label}\`"]\n`; // Rectangle
    }

    content += `  class ${safeId} ${node.node_type}\n`;
  });

  // Use edges if available, otherwise rebuild from node.next
  const edges = workflow.edges.length > 0
    ? workflow.edges
    : workflow.nodes.flatMap(node =>
        node.next
          .filter(targetId => nodeIds.has(targetId))
          .map((targetId, index) => ({
            id: `e-${node.node_id}-${targetId}`,
            source: node.node_id,
            target: targetId,
            sourcePortIndex: index,
            targetPortIndex: 0,
            label: node.node_type === NodeType.Condition
              ? (index === 0 ? 'True' : 'False')
              : '',
          }))
      );

  edges.forEach(edge => {
    const s = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const t = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    if (edge.label) {
      const cleanLabel = edge.label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '');
      content += `  ${s} -->|"${cleanLabel}"| ${t}\n`;
    } else {
      content += `  ${s} --> ${t}\n`;
    }
  });
  return content.trim();
}

interface MarkdownLabels {
  workflow: string;
  nodeList: string;
  functionDescLabel: string;
  inputEndpoints: string;
  outputEndpoints: string;
  none: string;
  flowTopology: string;
}

export function generateMarkdown(workflow: Workflow, labels: MarkdownLabels): string {
  let md = `# ${labels.workflow}: ${workflow.name}\n\n${workflow.description}\n\n## ${labels.nodeList}\n\n`;
  workflow.nodes.forEach(node => {
    md += `### ${node.node_id} (${node.node_type})\n- **${labels.functionDescLabel}**: ${node.description}\n- **${labels.inputEndpoints}**: ${node.inputs.join(', ') || labels.none}\n- **${labels.outputEndpoints}**: ${node.outputs.join(', ') || labels.none}\n\n`;
  });
  md += `## ${labels.flowTopology}\n\n`;
  // Derive edges from node.next when workflow.edges is empty (post-MD load).
  const edges: Edge[] = workflow.edges.length > 0
    ? workflow.edges
    : workflow.nodes.flatMap(node =>
        node.next.map((targetId, index) => ({
          id: `e-${node.node_id}-${targetId}`,
          source: node.node_id,
          target: targetId,
          sourcePortIndex: index,
          targetPortIndex: 0,
          label: node.node_type === NodeType.Condition
            ? (index === 0 ? 'True' : 'False')
            : '',
        }))
      );
  edges.forEach(edge => {
    md += `- ${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}\n`;
  });
  return md;
}

export function cleanWorkflowForExport(workflow: Workflow): object {
  const nodesWithoutPosition = workflow.nodes.map(({ position, ...rest }) => rest);
  return { ...workflow, nodes: nodesWithoutPosition };
}
