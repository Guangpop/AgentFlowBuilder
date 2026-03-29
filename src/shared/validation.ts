import { NodeType } from './types.js';

const VALID_NODE_TYPES = Object.values(NodeType);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWorkflow(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Workflow data must be an object'], warnings };
  }

  const workflow = data as any;

  // Check required fields
  if (!workflow.name || typeof workflow.name !== 'string') {
    errors.push('Workflow must have a "name" string field');
  }
  if (!workflow.description || typeof workflow.description !== 'string') {
    errors.push('Workflow must have a "description" string field');
  }
  if (!Array.isArray(workflow.nodes)) {
    errors.push('Workflow must have a "nodes" array');
    return { valid: false, errors, warnings };
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  workflow.nodes.forEach((node: any, i: number) => {
    if (!node.node_id) {
      errors.push(`Node ${i}: missing node_id`);
    } else if (nodeIds.has(node.node_id)) {
      errors.push(`Duplicate node_id: "${node.node_id}"`);
    } else {
      nodeIds.add(node.node_id);
    }

    if (!node.node_type || !VALID_NODE_TYPES.includes(node.node_type)) {
      errors.push(`Node ${node.node_id || i}: invalid node_type "${node.node_type}". Must be one of: ${VALID_NODE_TYPES.join(', ')}`);
    }

    if (!node.description) {
      warnings.push(`Node ${node.node_id || i}: missing description`);
    }

    if (!Array.isArray(node.inputs)) {
      errors.push(`Node ${node.node_id || i}: inputs must be an array`);
    }
    if (!Array.isArray(node.outputs)) {
      errors.push(`Node ${node.node_id || i}: outputs must be an array`);
    }
    if (!Array.isArray(node.next)) {
      errors.push(`Node ${node.node_id || i}: next must be an array`);
    }

    // Condition nodes must have exactly 2 outputs
    if (node.node_type === NodeType.Condition && Array.isArray(node.next) && node.next.length !== 2) {
      errors.push(`Condition node "${node.node_id}": must have exactly 2 next entries (True/False branches), got ${node.next.length}`);
    }
  });

  // Validate next references
  workflow.nodes.forEach((node: any) => {
    if (Array.isArray(node.next)) {
      node.next.forEach((targetId: string) => {
        if (!nodeIds.has(targetId)) {
          errors.push(`Node "${node.node_id}": next references non-existent node "${targetId}"`);
        }
      });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}
