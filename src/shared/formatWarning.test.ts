import { describe, it, expect } from 'vitest';
import { makeWarning } from './formatWarning.js';

describe('makeWarning', () => {
  it('builds a warning with defaults and optional fields', () => {
    const w = makeWarning('PARSE_FAILED', 'error', 'bad json');
    expect(w).toEqual({ code: 'PARSE_FAILED', severity: 'error', message: 'bad json' });

    const w2 = makeWarning('CONDITION_INFERRED', 'warn', 'inferred', { nodeId: 'n1' });
    expect(w2.nodeId).toBe('n1');
    expect(w2.severity).toBe('warn');
  });
});
