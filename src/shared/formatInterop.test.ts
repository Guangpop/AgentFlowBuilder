import { describe, it, expect } from 'vitest';
import { NodeType, Workflow } from './types.js';
import { serializeWorkflowMd, parseWorkflowMd } from './workflowMd.js';
import { serializeWorkflowJson, parseWorkflowJson } from './workflowJson.js';

const wf: Workflow = {
  name: 'interop_flow',
  description: 'cross-format',
  nodes: [
    { node_id: 'a', node_type: NodeType.UserInput, title: 'A', description: 'start', inputs: [], outputs: [], next: ['b'], position: { x: 0, y: 0 } },
    { node_id: 'b', node_type: NodeType.AgentAction, title: 'B', description: 'act', inputs: [], outputs: [], next: [], position: { x: 100, y: 0 } },
  ],
  edges: [],
};

function shape(w: Workflow) {
  return {
    name: w.name,
    description: w.description,
    nodes: w.nodes.map((n) => ({
      node_id: n.node_id,
      node_type: n.node_type,
      title: n.title,
      description: n.description,
      next: n.next,
    })),
  };
}

describe('cross-format md <-> json', () => {
  it('md -> json preserves the workflow structure', () => {
    const md = serializeWorkflowMd(wf);
    const fromMd = parseWorkflowMd(md).workflow;
    const json = serializeWorkflowJson(fromMd, { shape: 'full' });
    const fromJson = parseWorkflowJson(json).workflow;
    expect(shape(fromJson)).toEqual(shape(wf));
  });

  it('json -> md preserves the workflow structure', () => {
    const json = serializeWorkflowJson(wf, { shape: 'full' });
    const fromJson = parseWorkflowJson(json).workflow;
    const md = serializeWorkflowMd(fromJson);
    const fromMd = parseWorkflowMd(md).workflow;
    expect(shape(fromMd)).toEqual(shape(wf));
  });
});
