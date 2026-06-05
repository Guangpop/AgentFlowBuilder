// src/mcp/fileManager.snapshot.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FileManager } from './fileManager.js';
import { Workflow } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SHOWCASE = [
  'customer_service_agent',
  'deep_research_agent',
  'issue_triage_test',
  'oiwai_message_assistant',
];

/** Normalize a Workflow to a stable shape for snapshotting (sorted node order, no positions). */
function normalize(w: Workflow) {
  return {
    name: w.name,
    description: w.description,
    nodes: [...w.nodes]
      .sort((a, b) => a.node_id.localeCompare(b.node_id))
      .map((n) => ({
        node_id: n.node_id,
        node_type: n.node_type,
        title: n.title,
        description: n.description,
        inputs: n.inputs,
        outputs: n.outputs,
        config: n.config ?? null,
        next: n.next,
      })),
  };
}

describe('showcase workflows load identically (storage refactor gate)', () => {
  const fm = new FileManager(path.join(REPO_ROOT, 'workflows'));
  for (const name of SHOWCASE) {
    it(`${name} normalized structure is stable`, () => {
      const { workflow, format } = fm.load(name);
      expect(format).toBe('md'); // showcase ships only as .md
      expect(normalize(workflow)).toMatchSnapshot();
    });
  }
});
