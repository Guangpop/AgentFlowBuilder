import { WorkflowResponse, NodeType } from '../../types';
import { Language } from '../../locales';
import { getPrompts } from '../../prompts';

/**
 * Convert string to safe ID format
 */
export const slugifyId = (id: string): string =>
  id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

/**
 * Post-process workflow response from any AI provider
 * Handles: ID cleanup, next references, layout, edges rebuilding
 */
export function postProcessWorkflow(
  data: WorkflowResponse,
  language: Language
): WorkflowResponse {
  const p = getPrompts(language);

  if (!data.workflow || !data.workflow.nodes) {
    return data;
  }

  // 1. Clean all node IDs and build mapping
  const idMap = new Map<string, string>();
  data.workflow.nodes.forEach(node => {
    const cleanId = slugifyId(node.node_id);
    idMap.set(node.node_id, cleanId);
    node.node_id = cleanId;
  });

  // 2. Update next references
  data.workflow.nodes.forEach(node => {
    if (node.next) {
      node.next = node.next
        .map(n => idMap.get(n) || slugifyId(n))
        .filter(n => data.workflow.nodes.some(existing => existing.node_id === n));
    }
  });

  // 3. Auto layout (grid layout)
  data.workflow.nodes = data.workflow.nodes.map((node, index) => ({
    ...node,
    position: {
      x: 100 + (index % 3) * 450,
      y: 100 + Math.floor(index / 3) * 350
    }
  }));

  // 4. Rebuild edges array to ensure canvas connections
  // Use nodes.next as source of truth
  const finalEdges: any[] = [];
  const nodeIds = new Set(data.workflow.nodes.map(n => n.node_id));

  data.workflow.nodes.forEach(node => {
    if (node.next && Array.isArray(node.next)) {
      node.next.forEach((targetId, index) => {
        if (nodeIds.has(targetId)) {
          const isCondition = node.node_type === NodeType.Condition;
          let label = '';
          if (isCondition) {
            label = index === 0 ? p.conditionTrueLabel : p.conditionFalseLabel;
          }

          finalEdges.push({
            id: `edge-${node.node_id}-${targetId}-${index}`,
            source: node.node_id,
            target: targetId,
            sourcePortIndex: index,
            targetPortIndex: 0,
            label: label,
            isLoop: false
          });
        }
      });
    }
  });

  data.workflow.edges = finalEdges;

  return data;
}
