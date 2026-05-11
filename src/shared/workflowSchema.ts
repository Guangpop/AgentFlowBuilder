import { z } from 'zod';
import { NodeType } from './types.js';

/**
 * Zod schema mirroring the `Workflow` / `WorkflowNode` runtime shape.
 * Used by `parseWorkflowMd` to validate the parsed object before returning.
 *
 * Kept separate from `schema.ts:WORKFLOW_SCHEMA` (which is the JSON Schema
 * exposed to MCP tools for LLM consumption). When they drift, prefer this
 * file as source of truth — `WORKFLOW_SCHEMA` could be derived from it later.
 */

const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const NodeTypeSchema = z.nativeEnum(NodeType);

const WorkflowNodeSchema = z.object({
  node_id: z
    .string()
    .min(1, 'node_id must be non-empty'),
  node_type: NodeTypeSchema,
  title: z.string().optional(),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  config: z.record(z.any()).optional(),
  position: NodePositionSchema,
  next: z.array(z.string()),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourcePortIndex: z.number(),
  targetPortIndex: z.number(),
  label: z.string().optional(),
  isLoop: z.boolean().optional(),
});

export const WorkflowZodSchema = z.object({
  name: z.string().min(1, 'workflow name must be non-empty'),
  description: z.string(),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(EdgeSchema),
});

export type WorkflowZ = z.infer<typeof WorkflowZodSchema>;

/**
 * Format a ZodError into a single human-readable string with all issues.
 */
export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((iss) => {
      const path = iss.path.length > 0 ? iss.path.join('.') : '(root)';
      return `${path}: ${iss.message}`;
    })
    .join('; ');
}
