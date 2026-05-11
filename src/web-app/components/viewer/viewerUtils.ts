import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { NodeType, WorkflowNode } from '../../types';
import { BranchTarget } from './BranchCard';

export const PROSE_LONG_THRESHOLD = 120;

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const raw = marked.parse(md) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

export interface ConfigBlock {
  key: string;
  lang: string;
  code: string;
}

export interface ViewerSectionData {
  id: string;
  title: string;
  nodeType: NodeType;
  bodyHtml: string;
  configBlocks: ConfigBlock[];
  branches?: { kind: 'true' | 'false'; target?: BranchTarget }[];
}

export function splitNodeForViewer(
  node: WorkflowNode,
  nodeIndex: Map<string, WorkflowNode>
): ViewerSectionData {
  const bodyHtml = renderMarkdown(node.description || '');

  const configBlocks: ConfigBlock[] = [];
  if (node.config) {
    for (const [key, value] of Object.entries(node.config)) {
      if (typeof value === 'string' && (value.length >= PROSE_LONG_THRESHOLD || value.includes('\n'))) {
        configBlocks.push({
          key,
          lang: guessLang(node.config, key),
          code: value,
        });
      }
    }
  }

  let branches: ViewerSectionData['branches'] | undefined;
  if (node.node_type === NodeType.Condition) {
    const trueTargetId = node.next[0];
    const falseTargetId = node.next[1];
    branches = [
      { kind: 'true', target: branchTarget(trueTargetId, nodeIndex) },
      { kind: 'false', target: branchTarget(falseTargetId, nodeIndex) },
    ];
  }

  return {
    id: node.node_id,
    title: (node.title && node.title.trim()) || node.node_id,
    nodeType: node.node_type,
    bodyHtml,
    configBlocks,
    branches,
  };
}

export function branchTarget(
  id: string | undefined,
  nodeIndex: Map<string, WorkflowNode>
): BranchTarget | undefined {
  if (!id) return undefined;
  const node = nodeIndex.get(id);
  if (!node) return undefined;
  return {
    id: node.node_id,
    title: (node.title && node.title.trim()) || node.node_id,
    nodeType: node.node_type,
  };
}

export interface BranchPreviewStep {
  id: string;
  title: string;
  nodeType: NodeType;
}

/**
 * Walk forward from `startId` taking the first `next` edge at each step.
 * Stops on terminal (no next), at limit, or when the path loops back.
 */
export function bfsBranchPreview(
  startId: string | undefined,
  nodeIndex: Map<string, WorkflowNode>,
  limit = 5
): BranchPreviewStep[] {
  const out: BranchPreviewStep[] = [];
  if (!startId) return out;
  const seen = new Set<string>();
  let cursor: string | undefined = startId;
  while (cursor && !seen.has(cursor) && out.length < limit) {
    const node = nodeIndex.get(cursor);
    if (!node) break;
    seen.add(cursor);
    out.push({
      id: node.node_id,
      title: (node.title && node.title.trim()) || node.node_id,
      nodeType: node.node_type,
    });
    cursor = node.next[0];
  }
  return out;
}

/**
 * Find the entry node for walk mode: a node not referenced by any other
 * node's `next` array. Falls back to nodes[0] if no such root exists.
 */
export function findEntryNodeId(nodes: WorkflowNode[]): string | null {
  if (nodes.length === 0) return null;
  const referenced = new Set<string>();
  for (const node of nodes) {
    for (const id of node.next) referenced.add(id);
  }
  for (const node of nodes) {
    if (!referenced.has(node.node_id)) return node.node_id;
  }
  return nodes[0].node_id;
}

export function guessLang(config: Record<string, any>, key: string): string {
  if (key === 'scriptContent' && typeof config.scriptType === 'string') {
    const t = config.scriptType.toLowerCase();
    if (t === 'shell' || t === 'bash' || t === 'sh') return 'bash';
    return t;
  }
  if (key === 'script' && typeof config.language === 'string') {
    return config.language.toLowerCase();
  }
  return '';
}
