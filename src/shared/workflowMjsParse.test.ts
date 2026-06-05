// src/shared/workflowMjsParse.test.ts
import { describe, it, expect } from 'vitest';
import { parseWorkflowMjs } from './workflowMjsParse.js';

const sequential = `
export const meta = { name: "seq flow", description: "two steps", phases: [{ title: 'Run' }] };
phase('Run');
const a = await agent("first step");
const b = await agent("second step");
`;

const withLoop = `
export const meta = { name: "loopy", description: "has a loop", phases: [{ title: 'Run' }] };
const items = ['x','y'];
for (const it of items) { await agent("process " + it); }
`;

const withParallel = `
export const meta = { name: "par", description: "fan out", phases: [{ title: 'Run' }] };
const rs = await parallel(['a','b'].map((x) => () => agent("do " + x)));
`;

const nonLiteralMeta = `
const NAME = "computed";
export const meta = { name: NAME, description: "x", phases: [] };
await agent("step");
`;

const invalidJs = `export const meta = { name: "x"  ;;; this is not valid javascript @@@`;

describe('parseWorkflowMjs (best-effort)', () => {
  it('parses sequential literal agent() calls into linear nodes', () => {
    const { workflow, warnings } = parseWorkflowMjs(sequential);
    expect(workflow.name).toBe('seq flow');
    const agentNodes = workflow.nodes.filter((n) => n.description === 'first step' || n.description === 'second step');
    expect(agentNodes).toHaveLength(2);
    // wired linearly
    const first = workflow.nodes.find((n) => n.description === 'first step')!;
    expect(first.next.length).toBe(1);
    expect(warnings.every((w) => w.severity !== 'error')).toBe(true);
  });

  it('collapses a loop to a ScriptExecution boundary node + warning', () => {
    const { workflow, warnings } = parseWorkflowMjs(withLoop);
    expect(workflow.nodes.some((n) => n.node_type === 'ScriptExecution')).toBe(true);
    expect(warnings.some((w) => w.code === 'LOOP_COLLAPSED' || w.code === 'UNSUPPORTED_CONTROL_FLOW')).toBe(true);
  });

  it('collapses parallel/dynamic fan-out with a warning', () => {
    const { warnings } = parseWorkflowMjs(withParallel);
    expect(warnings.some((w) => w.code === 'DYNAMIC_FANOUT' || w.code === 'UNSUPPORTED_CONTROL_FLOW')).toBe(true);
  });

  it('warns on non-literal meta but still returns a workflow', () => {
    const { workflow, warnings } = parseWorkflowMjs(nonLiteralMeta);
    expect(warnings.some((w) => w.code === 'NON_LITERAL_META')).toBe(true);
    expect(workflow).toBeDefined();
  });

  it('never throws on invalid JS; returns stub + PARSE_FAILED', () => {
    const { workflow, warnings } = parseWorkflowMjs(invalidJs);
    expect(workflow.nodes).toHaveLength(0);
    expect(warnings[0].code).toBe('PARSE_FAILED');
    expect(warnings[0].severity).toBe('error');
  });

  it('uses fallbackName when meta name is missing/non-literal', () => {
    const { workflow } = parseWorkflowMjs(nonLiteralMeta, { fallbackName: 'from_file' });
    expect(workflow.name).toBe('from_file');
  });
});
