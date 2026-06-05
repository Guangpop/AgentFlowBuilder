// src/shared/codecRegistry.ts
import * as path from 'path';
import { Workflow } from './types.js';
import { makeWarning } from './formatWarning.js';
import { ParseOutcome, parseWorkflowJson, serializeWorkflowJson, JsonShape } from './workflowJson.js';
import { parseWorkflowMd, serializeWorkflowMd, WorkflowMdParseError } from './workflowMd.js';
import { serializeWorkflowMjs } from './workflowMjsSerialize.js';
import { parseWorkflowMjs } from './workflowMjsParse.js';

export type FormatId = 'json' | 'md' | 'mjs';

interface Codec {
  id: FormatId;
  ext: string; // includes dot, e.g. '.json'
  detect(content: string): boolean;
  parse(content: string): ParseOutcome;
  serialize(workflow: Workflow, opts?: { shape?: JsonShape }): string;
}

function emptyWorkflow(): Workflow {
  return { name: '', description: '', nodes: [], edges: [] };
}

function stripBom(s: string): string {
  return s.replace(/^﻿/, '');
}

const jsonCodec: Codec = {
  id: 'json',
  ext: '.json',
  detect: (content) => {
    const t = stripBom(content).trimStart();
    return t.startsWith('{') || t.startsWith('[');
  },
  parse: (content) => parseWorkflowJson(content),
  serialize: (workflow, opts) => serializeWorkflowJson(workflow, opts),
};

const mdCodec: Codec = {
  id: 'md',
  ext: '.md',
  detect: (content) => /^﻿?---\r?\n/.test(content),
  parse: (content) => {
    // Canonical MD files parse strictly. A parse failure here is fatal —
    // the generic shapeMdToWorkflow fallback lives in the import path, not
    // in the canonical file-load path.
    try {
      const { workflow, warnings } = parseWorkflowMd(content);
      return {
        workflow,
        warnings: warnings.map((msg) => makeWarning('SCHEMA_REPAIRED', 'warn', msg)),
      };
    } catch (err) {
      if (err instanceof WorkflowMdParseError) {
        return { workflow: emptyWorkflow(), warnings: [makeWarning('PARSE_FAILED', 'error', err.message)] };
      }
      throw err;
    }
  },
  serialize: (workflow) => serializeWorkflowMd(workflow),
};

const mjsCodec: Codec = {
  id: 'mjs',
  ext: '.mjs',
  detect: (content) => /export\s+const\s+meta\s*=/.test(content),
  parse: (content) => parseWorkflowMjs(content),
  serialize: (workflow) => serializeWorkflowMjs(workflow).code,
};

const CODECS: Codec[] = [jsonCodec, mdCodec, mjsCodec];
const byExt = new Map(CODECS.map((c) => [c.ext, c]));
const byId = new Map(CODECS.map((c) => [c.id, c]));

const MJS_ENABLED = process.env.AGENTFLOW_MJS === '1';

/** Formats eligible for bare-name load precedence + candidate discovery.
 *  mjs participates only when AGENTFLOW_MJS=1, so a stray name.mjs never
 *  silently shadows json/md when the feature is off. Explicit ops
 *  (serializeByFormat/parseByExtension/formatForExt) always support all formats. */
export function listFormats(): FormatId[] {
  return CODECS.map((c) => c.id).filter((id) => id !== 'mjs' || MJS_ENABLED);
}

export function formatForExt(ext: string): FormatId | undefined {
  return byExt.get(ext.toLowerCase())?.id;
}

/** Effective load/select precedence: the default format first, then the rest. */
export function effectivePriority(defaultFormat: FormatId): FormatId[] {
  return [defaultFormat, ...listFormats().filter((f) => f !== defaultFormat)];
}

/** Native file loading: pick the codec by file extension. Never throws. */
export function parseByExtension(filePath: string, content: string): ParseOutcome {
  const codec = byExt.get(path.extname(filePath).toLowerCase());
  if (!codec) {
    return {
      workflow: emptyWorkflow(),
      warnings: [makeWarning('PARSE_FAILED', 'error', `Unsupported workflow extension: ${path.extname(filePath)}`)],
    };
  }
  return codec.parse(content);
}

/** Pasted/unknown content: try JSON first, then MD frontmatter. Never throws. */
export function parseByDetection(content: string): ParseOutcome & { format?: FormatId } {
  if (jsonCodec.detect(content)) {
    return { ...jsonCodec.parse(content), format: 'json' };
  }
  if (mdCodec.detect(content)) {
    return { ...mdCodec.parse(content), format: 'md' };
  }
  if (mjsCodec.detect(content)) {
    return { ...mjsCodec.parse(content), format: 'mjs' };
  }
  return {
    workflow: emptyWorkflow(),
    warnings: [makeWarning('PARSE_FAILED', 'error', 'Unrecognized content: not JSON and not workflow Markdown.')],
  };
}

export function serializeByFormat(workflow: Workflow, format: FormatId, opts?: { shape?: JsonShape }): string {
  const codec = byId.get(format);
  if (!codec) throw new Error(`Unknown workflow format: ${format}`);
  return codec.serialize(workflow, opts);
}
