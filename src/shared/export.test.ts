import { describe, it, expect } from 'vitest';
import { generateMermaid, sanitizeMermaidLabel } from './export.js';
import { NodeType, Workflow } from './types.js';

function mkNode(overrides: Partial<Workflow['nodes'][number]>): Workflow['nodes'][number] {
  return {
    node_id: 'n',
    node_type: NodeType.AgentReasoning,
    title: '',
    description: '',
    inputs: [],
    outputs: [],
    next: [],
    position: { x: 0, y: 0 },
    ...overrides,
  };
}
function mkWorkflow(nodes: Workflow['nodes']): Workflow {
  return { name: 't', description: '', nodes, edges: [] };
}

describe('sanitizeMermaidLabel', () => {
  it('removes backticks (would close markdown-string)', () => {
    expect(sanitizeMermaidLabel('mark as `missing` value')).toBe("mark as 'missing' value");
  });
  it('replaces double quotes (would close outer literal)', () => {
    expect(sanitizeMermaidLabel('say "hello"')).toContain('hello');
    expect(sanitizeMermaidLabel('say "hello"')).not.toContain('"');
  });
  it('collapses newlines into spaces', () => {
    expect(sanitizeMermaidLabel('line1\nline2\r\nline3')).toBe('line1 line2 line3');
  });
  it('strips brackets/braces that confuse shape syntax', () => {
    const out = sanitizeMermaidLabel('an [item] and {ref}');
    expect(out).not.toMatch(/[\[\]{}]/);
    expect(out).toContain('item');
    expect(out).toContain('ref');
  });
  it('handles empty / null input', () => {
    expect(sanitizeMermaidLabel('')).toBe('');
    expect(sanitizeMermaidLabel(undefined as any)).toBe('');
  });
  it('is idempotent on already-clean text', () => {
    const clean = 'plain description without special chars';
    expect(sanitizeMermaidLabel(clean)).toBe(clean);
  });
});

describe('generateMermaid — adversarial descriptions', () => {
  it('does not emit raw backticks from description into label', () => {
    const out = generateMermaid(
      mkWorkflow([mkNode({ node_id: 'a', description: 'mark `missing` fields' })])
    );
    // Outer backticks (the markdown-string delimiters) are allowed.
    // What we forbid: backticks INSIDE the quoted label content.
    const m = out.match(/\["`([^]*?)`"\]/);
    expect(m).toBeTruthy();
    expect(m![1]).not.toContain('`');
  });

  it('does not emit raw double quotes inside label content', () => {
    const out = generateMermaid(
      mkWorkflow([mkNode({ node_id: 'a', description: 'he said "hi"' })])
    );
    const m = out.match(/\["`([^]*?)`"\]/);
    expect(m![1]).not.toContain('"');
  });

  it('strips embedded newlines from description', () => {
    const out = generateMermaid(
      mkWorkflow([mkNode({ node_id: 'a', description: 'first\nsecond' })])
    );
    const m = out.match(/\["`([^]*?)`"\]/);
    // The deliberate \n we add stays (between node_id and description),
    // but no further embedded newlines in description.
    expect(m![1].split('\\n').length).toBeLessThanOrEqual(2);
  });

  it('renders without lexer-confusing chars across all 9 shapes', () => {
    const types = [
      NodeType.UserInput,
      NodeType.AgentReasoning,
      NodeType.AgentQuestion,
      NodeType.UserResponse,
      NodeType.AgentAction,
      NodeType.Condition,
      NodeType.ScriptExecution,
      NodeType.MCPTool,
      NodeType.AgentSkill,
    ];
    const nodes = types.map((t, i) =>
      mkNode({
        node_id: `n${i}`,
        node_type: t,
        description: 'has `code`, "quote", [bracket], {brace}, and\nnewline',
      })
    );
    const out = generateMermaid(mkWorkflow(nodes));
    // Find all label content blocks
    const labels = [...out.matchAll(/\["?`([^]*?)`"?\]|{{"`([^]*?)`"}}|\[\/"`([^]*?)`"\/\]/g)]
      .map((m) => m[1] || m[2] || m[3]);
    for (const lbl of labels) {
      expect(lbl).not.toContain('`');
      expect(lbl).not.toContain('"');
      expect(lbl).not.toMatch(/[\[\]{}]/);
    }
  });
});
