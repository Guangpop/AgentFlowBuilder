import { describe, it, expect } from 'vitest';
import { shapeMdToWorkflow } from './mdToWorkflow.js';
import { NodeType } from './types.js';

describe('shapeMdToWorkflow', () => {
  it('handles H1 + H2 sections as workflow + nodes', () => {
    const md = `# My SOP

This describes the process.

## Receive Input

Get the user's question.

## Analyze

Reason about it.

## Reply
Tell the user.
`;
    const { workflow, warnings } = shapeMdToWorkflow(md);
    expect(workflow.name).toBe('My SOP');
    expect(workflow.description).toContain('describes the process');
    expect(workflow.nodes.length).toBe(3);
    expect(workflow.nodes[0].title).toBe('Receive Input');
    expect(workflow.nodes[1].title).toBe('Analyze');
    expect(workflow.nodes[2].title).toBe('Reply');
    // Linear chain
    expect(workflow.nodes[0].next).toEqual([workflow.nodes[1].node_id]);
    expect(workflow.nodes[1].next).toEqual([workflow.nodes[2].node_id]);
    expect(workflow.nodes[2].next).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('detects Condition from heading keyword', () => {
    const md = `# Flow

## Start
First.

## If user is logged in
Branch logic.

## Done
End.
`;
    const { workflow } = shapeMdToWorkflow(md);
    expect(workflow.nodes[1].node_type).toBe(NodeType.Condition);
    expect(workflow.nodes[1].next.length).toBe(2);
  });

  it('detects UserInput from heading keyword', () => {
    const md = `# Flow

## 使用者輸入問題
prompt
`;
    const { workflow } = shapeMdToWorkflow(md);
    expect(workflow.nodes[0].node_type).toBe(NodeType.UserInput);
  });

  it('falls back to single node when no H2 present', () => {
    const md = `# Title only

Some prose without any sections.
More prose.
`;
    const { workflow, warnings } = shapeMdToWorkflow(md);
    expect(workflow.nodes.length).toBe(1);
    expect(workflow.nodes[0].title).toBe('Title only');
    expect(workflow.nodes[0].description).toContain('Some prose');
    expect(warnings[0]).toContain('No H2 headings');
  });

  it('uses fallbackName when no H1 in source', () => {
    const md = `## First

body
`;
    const { workflow } = shapeMdToWorkflow(md, 'my-import');
    expect(workflow.name).toBe('my-import');
  });

  it('slugifies node IDs and dedupes', () => {
    const md = `# Flow

## Setup

a

## Setup

b
`;
    const { workflow } = shapeMdToWorkflow(md);
    expect(workflow.nodes[0].node_id).toBe('setup');
    expect(workflow.nodes[1].node_id).toMatch(/^setup_\d+$/);
  });

  it('handles CJK headings', () => {
    const md = `# 客服流程

## 接收問題

prose
`;
    const { workflow } = shapeMdToWorkflow(md);
    expect(workflow.name).toBe('客服流程');
    expect(workflow.nodes[0].title).toBe('接收問題');
    expect(workflow.nodes[0].node_id).toBe('接收問題');
  });

  it('assigns positions stacked vertically', () => {
    const md = `# Flow

## A
a

## B
b

## C
c
`;
    const { workflow } = shapeMdToWorkflow(md);
    expect(workflow.nodes[0].position.y).toBeLessThan(workflow.nodes[1].position.y);
    expect(workflow.nodes[1].position.y).toBeLessThan(workflow.nodes[2].position.y);
  });
});
