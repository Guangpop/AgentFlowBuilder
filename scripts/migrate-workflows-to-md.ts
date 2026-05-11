/**
 * One-shot migration: convert every `workflows/*.json` to `workflows/*.md`.
 * Verifies structural round-trip and prints a summary.
 *
 * Usage: npm run migrate:md  (or `tsx scripts/migrate-workflows-to-md.ts`)
 *
 * Does NOT delete the original .json files — Phase D will do that after a
 * manual canvas verification pass.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  parseWorkflowMd,
  serializeWorkflowMd,
} from '../src/shared/workflowMd.js';
import { legacyJsonToWorkflow } from '../src/mcp/fileManager.js';
import type { Workflow } from '../src/shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_DIR = path.resolve(__dirname, '..', 'workflows');

function compareStructural(a: Workflow, b: Workflow): string[] {
  const diffs: string[] = [];
  if (a.name !== b.name) diffs.push(`name: ${a.name} != ${b.name}`);
  if (a.description !== b.description) diffs.push(`description mismatch`);
  if (a.nodes.length !== b.nodes.length) {
    diffs.push(`node count: ${a.nodes.length} != ${b.nodes.length}`);
    return diffs;
  }
  for (let i = 0; i < a.nodes.length; i++) {
    const na = a.nodes[i];
    const nb = b.nodes[i];
    const id = na.node_id;
    if (na.node_id !== nb.node_id) diffs.push(`[${id}] node_id mismatch`);
    if (na.node_type !== nb.node_type) diffs.push(`[${id}] node_type mismatch`);
    if (na.title !== nb.title) diffs.push(`[${id}] title mismatch`);
    if (na.description !== nb.description) diffs.push(`[${id}] description mismatch`);
    if (JSON.stringify(na.inputs) !== JSON.stringify(nb.inputs)) diffs.push(`[${id}] inputs mismatch`);
    if (JSON.stringify(na.outputs) !== JSON.stringify(nb.outputs)) diffs.push(`[${id}] outputs mismatch`);
    if (JSON.stringify(na.next) !== JSON.stringify(nb.next)) diffs.push(`[${id}] next mismatch`);
    if (JSON.stringify(na.position) !== JSON.stringify(nb.position)) diffs.push(`[${id}] position mismatch`);
    if (JSON.stringify(na.config ?? null) !== JSON.stringify(nb.config ?? null)) {
      diffs.push(`[${id}] config mismatch`);
    }
  }
  return diffs;
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s;
  return s + ' '.repeat(n - s.length);
}

function main() {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    console.error(`workflows directory not found: ${WORKFLOW_DIR}`);
    process.exit(1);
  }

  const jsonFiles = fs
    .readdirSync(WORKFLOW_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    console.log('No .json workflows to migrate.');
    return;
  }

  console.log(`Found ${jsonFiles.length} workflow(s) to migrate.\n`);
  console.log(pad('FILE', 36), pad('NODES', 7), pad('STATUS', 12), 'NOTES');
  console.log('-'.repeat(80));

  let migrated = 0;
  let failed = 0;

  for (const file of jsonFiles) {
    const basename = file.replace(/\.json$/, '');
    const mdFile = `${basename}.md`;
    const jsonPath = path.join(WORKFLOW_DIR, file);
    const mdPath = path.join(WORKFLOW_DIR, mdFile);

    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const original = legacyJsonToWorkflow(raw);
      const md = serializeWorkflowMd(original);
      // Strict verify: any warning means the migration produced an invalid round-trip.
      const { workflow: parsed, warnings } = parseWorkflowMd(md, { strict: true });
      const diffs = compareStructural(original, parsed);
      if (diffs.length > 0) {
        failed++;
        console.log(
          pad(file, 36),
          pad(String(original.nodes.length), 7),
          pad('DIFF', 12),
          diffs.slice(0, 3).join('; ') + (diffs.length > 3 ? ` (+${diffs.length - 3} more)` : '')
        );
        continue;
      }

      fs.writeFileSync(mdPath, md, 'utf-8');
      migrated++;
      const noteParts: string[] = [];
      if (warnings.length > 0) noteParts.push(`${warnings.length} warning(s)`);
      console.log(
        pad(file, 36),
        pad(String(original.nodes.length), 7),
        pad('OK', 12),
        `→ ${mdFile}${noteParts.length ? '  ' + noteParts.join('; ') : ''}`
      );
    } catch (e: any) {
      failed++;
      console.log(
        pad(file, 36),
        pad('-', 7),
        pad('ERROR', 12),
        e.message
      );
    }
  }

  console.log('-'.repeat(80));
  console.log(`Migrated: ${migrated}    Failed: ${failed}`);
  console.log('\nLegacy .json files are intentionally left in place. They will be removed in a later phase after manual verification.');
}

main();
