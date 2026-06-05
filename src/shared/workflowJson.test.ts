import { describe, it, expect } from 'vitest';
import { serializeWorkflowJson, parseWorkflowJson } from './workflowJson.js';
import { NodeType, Workflow } from './types.js';

const sample: Workflow = {
  name: 'sample_flow',
  description: 'demo',
  nodes: [
    {
      node_id: 'a',
      node_type: NodeType.UserInput,
      title: 'A',
      description: 'start',
      inputs: [],
      outputs: ['x'],
      next: ['b'],
      position: { x: 10, y: 20 },
    },
    {
      node_id: 'b',
      node_type: NodeType.AgentAction,
      title: 'B',
      description: 'do it',
      inputs: ['x'],
      outputs: [],
      config: { tool: 'demo' },
      next: [],
      position: { x: 30, y: 40 },
    },
  ],
  edges: [],
};

describe('serializeWorkflowJson', () => {
  it('full shape is a byte-stable roundtrip', () => {
    const s1 = serializeWorkflowJson(sample, { shape: 'full' });
    const reparsed = parseWorkflowJson(s1).workflow;
    const s2 = serializeWorkflowJson(reparsed, { shape: 'full' });
    expect(s2).toBe(s1);
  });

  it('full shape preserves positions; clean shape strips them', () => {
    expect(serializeWorkflowJson(sample, { shape: 'full' })).toContain('"position"');
    const clean = serializeWorkflowJson(sample, { shape: 'clean' });
    expect(clean).not.toContain('"position"');
    expect(clean).toContain('"node_id": "a"');
  });

  it('defaults to full shape', () => {
    expect(serializeWorkflowJson(sample)).toBe(serializeWorkflowJson(sample, { shape: 'full' }));
  });
});

describe('parseWorkflowJson', () => {
  it('accepts a bare workflow object', () => {
    const { workflow, warnings } = parseWorkflowJson(
      JSON.stringify({ name: 'w', description: '', nodes: [], edges: [] }),
    );
    expect(workflow.name).toBe('w');
    expect(warnings).toHaveLength(0);
  });

  it('unwraps a { workflow } envelope', () => {
    const { workflow } = parseWorkflowJson(
      JSON.stringify({ confirmation: 'ok', workflow: { name: 'wrapped', description: '', nodes: [], edges: [] } }),
    );
    expect(workflow.name).toBe('wrapped');
  });

  it('derives a node title from node_id when missing (legacy fixup)', () => {
    const { workflow } = parseWorkflowJson(
      JSON.stringify({
        name: 'legacy',
        description: '',
        nodes: [{ node_id: 'step_one', node_type: 'UserInput', description: '', inputs: [], outputs: [], next: [], position: { x: 0, y: 0 } }],
        edges: [],
      }),
    );
    expect(workflow.nodes[0].title).toBe('Step One');
  });

  it('returns PARSE_FAILED on invalid JSON without throwing', () => {
    const { workflow, warnings } = parseWorkflowJson('{ not json');
    expect(workflow.nodes).toHaveLength(0);
    expect(warnings[0].code).toBe('PARSE_FAILED');
    expect(warnings[0].severity).toBe('error');
  });

  it('warns (does not throw) when schema is invalid, e.g. missing name', () => {
    const { warnings } = parseWorkflowJson(JSON.stringify({ description: '', nodes: [], edges: [] }));
    expect(warnings.some((w) => w.code === 'PARSE_FAILED')).toBe(true);
  });
});
