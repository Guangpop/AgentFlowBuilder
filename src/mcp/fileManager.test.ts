import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileManager } from './fileManager.js';
import { NodeType, Workflow } from '../shared/types.js';
import { serializeWorkflowMd } from '../shared/workflowMd.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function tmpDir(): string {
  return fs.mkdtempSync(path.join(fs.realpathSync(require('os').tmpdir()), 'afb-fm-'));
}

describe('FileManager (.md primary, .json legacy)', () => {
  let dir: string;
  let fm: FileManager;

  beforeEach(() => {
    dir = tmpDir();
    fm = new FileManager(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const sample: Workflow = {
    name: 'sample_flow',
    description: 'just a test',
    nodes: [
      {
        node_id: 'a',
        node_type: NodeType.UserInput,
        title: 'A',
        description: 'start',
        inputs: [],
        outputs: [],
        next: [],
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  };

  // valid canonical MD for list() tests, built from the codec
  function serializeMdFixture(): string {
    return serializeWorkflowMd({ ...sample, name: 'only-md' });
  }

  it('saves as json (default) and loads back', () => {
    const { path: savedPath, format } = fm.save('sample_flow', sample);
    expect(format).toBe('json');
    expect(savedPath.endsWith('.json')).toBe(true);
    expect(fs.existsSync(savedPath)).toBe(true);

    const { workflow, path: loadedPath, format: loadedFormat } = fm.load('sample_flow');
    expect(loadedPath).toBe(savedPath);
    expect(loadedFormat).toBe('json');
    expect(workflow.name).toBe(sample.name);
    expect(workflow.nodes[0].node_id).toBe('a');
    expect(workflow.nodes[0].title).toBe('A');
  });

  it('saves with an explicit format and writes back that format on re-save', () => {
    const first = fm.save('md_flow', sample, { format: 'md' });
    expect(first.format).toBe('md');
    expect(first.path.endsWith('.md')).toBe(true);
    // Re-save without a format: the single existing variant (.md) is preserved.
    const second = fm.save('md_flow', sample);
    expect(second.format).toBe('md');
    expect(fs.existsSync(path.join(dir, 'md_flow.json'))).toBe(false);
  });

  it('falls back to legacy .json when no .md exists', () => {
    const legacyJson = {
      name: 'legacy_flow',
      description: 'pre-migration',
      nodes: [
        {
          node_id: 'step_one',
          node_type: NodeType.UserInput,
          description: 'first',
          inputs: [],
          outputs: [],
          next: [],
          position: { x: 1, y: 2 },
        },
      ],
      edges: [],
    };
    const jsonPath = path.join(dir, 'legacy_flow.json');
    fs.writeFileSync(jsonPath, JSON.stringify(legacyJson, null, 2), 'utf-8');

    const { workflow, path: loadedPath } = fm.load('legacy_flow');
    expect(loadedPath).toBe(jsonPath);
    expect(workflow.name).toBe('legacy_flow');
    expect(workflow.nodes[0].title).toBe('Step One'); // derived
  });

  it('throws when a legacy .json is corrupt', () => {
    fs.writeFileSync(path.join(dir, 'broken.json'), '{ not valid json', 'utf-8');
    expect(() => fm.load('broken')).toThrow(/Failed to parse/);
  });

  it('list() dedupes by basename and selects the default (json) when both exist', () => {
    fm.save('dup', sample, { format: 'md' });
    fm.save('dup', sample, { format: 'json' });
    fs.writeFileSync(path.join(dir, 'only-md.md'), serializeMdFixture(), 'utf-8');

    const list = fm.list();
    const dupEntry = list.find((e) => e.name === 'dup');
    expect(dupEntry?.selectedFormat).toBe('json');
    expect(dupEntry?.formats.sort()).toEqual(['json', 'md']);
    expect(list.filter((e) => e.name === 'dup').length).toBe(1);
    expect(list.some((e) => e.name === 'only-md')).toBe(true);
  });

  it('loads each of the showcase repository workflows', () => {
    const realFm = new FileManager(path.join(REPO_ROOT, 'workflows'));
    for (const name of [
      'customer_service_agent',
      'deep_research_agent',
      'issue_triage_test',
      'oiwai_message_assistant',
    ]) {
      const { workflow, path: loadedPath } = realFm.load(name);
      expect(loadedPath.endsWith('.md')).toBe(true);
      expect(workflow.nodes.length).toBeGreaterThan(0);
      // Every node has a title
      for (const node of workflow.nodes) {
        expect(node.title).toBeTruthy();
      }
    }
  });

  it('delete() removes both .md and .json if both present', () => {
    fm.save('both', sample, { format: 'md' });
    fm.save('both', sample, { format: 'json' });
    const { deleted } = fm.delete('both');
    expect(deleted.sort()).toEqual(['json', 'md']);
    expect(fs.existsSync(path.join(dir, 'both.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'both.json'))).toBe(false);
  });

  it('delete(name, format) removes only that variant', () => {
    fm.save('partial', sample, { format: 'md' });
    fm.save('partial', sample, { format: 'json' });
    const { deleted } = fm.delete('partial', 'json');
    expect(deleted).toEqual(['json']);
    expect(fs.existsSync(path.join(dir, 'partial.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'partial.md'))).toBe(true);
  });
});
