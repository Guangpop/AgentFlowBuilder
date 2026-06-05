// src/shared/codecRegistry.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseByExtension, parseByDetection, serializeByFormat,
  listFormats, effectivePriority, formatForExt,
} from './codecRegistry.js';
import { NodeType, Workflow } from './types.js';

const wf: Workflow = {
  name: 'reg_flow', description: 'd',
  nodes: [{ node_id: 'a', node_type: NodeType.UserInput, title: 'A', description: 's', inputs: [], outputs: [], next: [], position: { x: 0, y: 0 } }],
  edges: [],
};

describe('codecRegistry', () => {
  it('lists json and md', () => {
    expect(listFormats()).toEqual(['json', 'md']);
  });

  it('formatForExt is case-insensitive and returns undefined for unknown', () => {
    expect(formatForExt('.JSON')).toBe('json');
    expect(formatForExt('.md')).toBe('md');
    expect(formatForExt('.txt')).toBeUndefined();
  });

  it('effectivePriority puts the default first, then the rest', () => {
    expect(effectivePriority('json')).toEqual(['json', 'md']);
    expect(effectivePriority('md')).toEqual(['md', 'json']);
  });

  it('parseByExtension routes by extension', () => {
    const json = serializeByFormat(wf, 'json');
    expect(parseByExtension('/x/reg_flow.json', json).workflow.name).toBe('reg_flow');
    const md = serializeByFormat(wf, 'md');
    expect(parseByExtension('/x/reg_flow.md', md).workflow.name).toBe('reg_flow');
  });

  it('parseByExtension returns a fatal warning (no throw) for unsupported ext', () => {
    const out = parseByExtension('/x/reg_flow.txt', 'whatever');
    expect(out.warnings.some((w) => w.severity === 'error')).toBe(true);
    expect(out.workflow.nodes).toHaveLength(0);
  });

  it('parseByExtension on broken MD yields a fatal warning, never throws', () => {
    const out = parseByExtension('/x/broken.md', 'no frontmatter here');
    expect(out.warnings.some((w) => w.severity === 'error')).toBe(true);
  });

  it('parseByDetection sniffs json (with BOM/whitespace) and md', () => {
    const json = serializeByFormat(wf, 'json');
    expect(parseByDetection('﻿  ' + json).format).toBe('json');
    const md = serializeByFormat(wf, 'md');
    expect(parseByDetection(md).format).toBe('md');
  });

  it('parseByDetection returns fatal for unrecognized content', () => {
    const out = parseByDetection('just some prose, no structure');
    expect(out.format).toBeUndefined();
    expect(out.warnings.some((w) => w.severity === 'error')).toBe(true);
  });

  it('serializeByFormat throws for an unknown format id', () => {
    // @ts-expect-error testing runtime guard
    expect(() => serializeByFormat(wf, 'xml')).toThrow();
  });
});
