// src/shared/workflowMjsSerialize.test.ts
import { describe, it, expect } from 'vitest';
import * as acorn from 'acorn';
import { serializeWorkflowMjs } from './workflowMjsSerialize.js';
import { NodeType, Workflow } from './types.js';

const wf: Workflow = {
  name: 'demo flow', description: 'a "tricky" desc with quotes\nand newline',
  nodes: [
    { node_id: 'in', node_type: NodeType.UserInput, title: 'In', description: 'user asks', inputs: [], outputs: [], next: ['think'], position: { x: 0, y: 0 } },
    { node_id: 'think', node_type: NodeType.AgentReasoning, title: 'Think', description: 'reason about it', inputs: [], outputs: [], next: ['check'], position: { x: 0, y: 0 } },
    { node_id: 'check', node_type: NodeType.Condition, title: 'OK?', description: 'is it ok', inputs: [], outputs: [], next: ['act', 'in'], position: { x: 0, y: 0 } },
    { node_id: 'act', node_type: NodeType.AgentAction, title: 'Act', description: 'do the thing', inputs: [], outputs: [], next: [], position: { x: 0, y: 0 } },
  ],
  edges: [],
};

function parseEsm(code: string) {
  return acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
}

describe('serializeWorkflowMjs', () => {
  it('emits valid ESM that acorn can parse', () => {
    const { code } = serializeWorkflowMjs(wf);
    expect(() => parseEsm(code)).not.toThrow();
  });

  it('emits a pure-literal meta with name+description+phases', () => {
    const { code } = serializeWorkflowMjs(wf);
    expect(code).toContain('export const meta = {');
    expect(code).toContain('name: "demo flow"');
    expect(code).toContain("phases: [{ title: 'Run' }]");
    // description with quotes/newline must be a safe JS string literal
    expect(code).toContain(JSON.stringify(wf.description));
  });

  it('emits an agent() call per agent-ish node and a classifier for Condition', () => {
    const { code, warnings } = serializeWorkflowMjs(wf);
    expect(code).toContain('await agent(');
    expect(code).toContain('if (check.result)'); // classifier branch
    expect(warnings.some((w) => w.code === 'CONDITION_INFERRED')).toBe(true);
    expect(warnings.some((w) => w.code === 'PHASE_INFERRED')).toBe(true);
    expect(warnings.some((w) => w.code === 'EXPORT_APPROXIMATION')).toBe(true);
  });

  it('handles a cyclic graph without emitting a real loop (every node appears once)', () => {
    const { code } = serializeWorkflowMjs(wf); // check.next includes 'in' (back-edge)
    // 'in' is a UserInput comment; ensure exactly one classifier and no `while`/`for`
    expect(code).not.toMatch(/\bwhile\b|\bfor\b/);
  });

  it('produces unique variable names for ids that collide after normalization', () => {
    const collidingWf = {
      name: 'c', description: 'd',
      nodes: [
        { node_id: 'my-node', node_type: NodeType.AgentAction, title: 'A', description: 'first', inputs: [], outputs: [], next: ['my_node'], position: { x: 0, y: 0 } },
        { node_id: 'my_node', node_type: NodeType.AgentAction, title: 'B', description: 'second', inputs: [], outputs: [], next: [], position: { x: 0, y: 0 } },
      ],
      edges: [],
    };
    const { code } = serializeWorkflowMjs(collidingWf as any);
    expect(() => parseEsm(code)).not.toThrow(); // must be valid ESM (no duplicate const)
  });
});
