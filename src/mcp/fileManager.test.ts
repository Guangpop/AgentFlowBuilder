import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileManager } from './fileManager.js';
import { NodeType, Workflow } from '../shared/types.js';

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

  it('saves as .md and loads back', () => {
    const savedPath = fm.save('sample_flow', sample);
    expect(savedPath.endsWith('.md')).toBe(true);
    expect(fs.existsSync(savedPath)).toBe(true);

    const { workflow, path: loadedPath } = fm.load('sample_flow');
    expect(loadedPath).toBe(savedPath);
    expect(workflow.name).toBe(sample.name);
    expect(workflow.nodes[0].node_id).toBe('a');
    expect(workflow.nodes[0].title).toBe('A');
    expect(workflow.nodes[0].description).toBe('start');
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

  it('list() dedupes by basename, prefers .md when both exist', () => {
    fm.save('dup', sample);
    fs.writeFileSync(path.join(dir, 'dup.json'), '{"name":"dup","description":"old","nodes":[]}', 'utf-8');
    fs.writeFileSync(path.join(dir, 'only-json.json'), '{"name":"only-json","description":"x","nodes":[]}', 'utf-8');

    const list = fm.list();
    const dupEntry = list.find((e) => e.name === 'dup');
    expect(dupEntry?.path.endsWith('.md')).toBe(true);
    expect(list.some((e) => e.name === 'only-json')).toBe(true);
    // No duplicates
    expect(list.filter((e) => e.name === 'dup').length).toBe(1);
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
    fm.save('both', sample);
    fs.writeFileSync(path.join(dir, 'both.json'), '{"name":"both","nodes":[]}', 'utf-8');
    expect(fm.delete('both')).toBe(true);
    expect(fs.existsSync(path.join(dir, 'both.md'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'both.json'))).toBe(false);
  });
});
