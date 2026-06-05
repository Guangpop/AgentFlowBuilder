import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('codecRegistry with AGENTFLOW_MJS=1 (flag on)', () => {
  const prev = process.env.AGENTFLOW_MJS;
  beforeEach(() => {
    process.env.AGENTFLOW_MJS = '1';
    vi.resetModules();
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.AGENTFLOW_MJS;
    else process.env.AGENTFLOW_MJS = prev;
    vi.resetModules();
  });

  it('listFormats includes mjs when the flag is on', async () => {
    const mod = await import('./codecRegistry.js');
    expect(mod.listFormats()).toEqual(['json', 'md', 'mjs']);
  });

  it('effectivePriority includes mjs (last) when the flag is on', async () => {
    const mod = await import('./codecRegistry.js');
    expect(mod.effectivePriority('json')).toEqual(['json', 'md', 'mjs']);
  });
});
