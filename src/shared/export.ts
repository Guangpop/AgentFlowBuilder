import { Workflow, WorkflowNode, Edge, NodeType } from './types.js';

export function generateMermaid(workflow: Workflow): string {
  let content = "graph TD\n";
  content += "  classDef UserInput fill:#1e3a8a,stroke:#3b82f6,color:#fff\n";
  content += "  classDef Reasoning fill:#4c1d95,stroke:#8b5cf6,color:#fff\n";
  content += "  classDef Condition fill:#7c2d12,stroke:#f97316,color:#fff\n";
  content += "  classDef Action fill:#064e3b,stroke:#10b981,color:#fff\n";

  workflow.nodes.forEach(node => {
    const safeId = node.node_id.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanName = node.node_id.replace(/[\[\]"()]/g, '');
    const cleanType = node.node_type.replace(/[\[\]"()]/g, '');
    content += `  ${safeId}["${cleanName} (${cleanType})"]\n`;

    if (node.node_type === NodeType.UserInput) content += `  class ${safeId} UserInput\n`;
    else if (node.node_type === NodeType.AgentReasoning) content += `  class ${safeId} Reasoning\n`;
    else if (node.node_type === NodeType.Condition) content += `  class ${safeId} Condition\n`;
    else if (node.node_type === NodeType.AgentAction) content += `  class ${safeId} Action\n`;
  });

  workflow.edges.forEach(edge => {
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
