import { Workflow, WorkflowNode, Edge, NodeType } from './types.js';

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
    const label = node.description
      ? `${node.node_id}\\n${node.description.slice(0, 40)}${node.description.length > 40 ? '...' : ''}`
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
  workflow.edges.forEach(edge => {
    md += `- ${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}\n`;
  });
  return md;
}

export function cleanWorkflowForExport(workflow: Workflow): object {
  const nodesWithoutPosition = workflow.nodes.map(({ position, ...rest }) => rest);
  return { ...workflow, nodes: nodesWithoutPosition };
}
