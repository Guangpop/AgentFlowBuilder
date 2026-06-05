// src/shared/formatWarning.ts

/**
 * Structured, machine-actionable warning emitted by any format codec
 * (parse or serialize). Surfaced in the Web UI (toast) and in MCP tool
 * responses. The full code set is the cross-phase contract; P1 emits only
 * a subset (PARSE_FAILED), later phases emit the rest.
 */
// Active in Phase 1: PARSE_FAILED. The remaining codes are reserved for
// later phases (storage layer + .mjs interop) and are part of the stable
// cross-phase contract.
export type WarningCode =
  | 'PARSE_FAILED'
  | 'SCHEMA_REPAIRED'
  | 'NON_LITERAL_META'
  | 'META_MISSING'
  | 'UNSUPPORTED_CONTROL_FLOW'
  | 'DYNAMIC_FANOUT'
  | 'LOOP_COLLAPSED'
  | 'BUDGET_LOOP_COLLAPSED'
  | 'BRANCH_COLLAPSED'
  | 'NON_LITERAL_ARGUMENT'
  | 'DATAFLOW_LOST'
  | 'PHASE_INFERRED'
  | 'CONDITION_INFERRED'
  | 'PROMPT_TRUNCATED'
  | 'EXPORT_APPROXIMATION'
  | 'UNKNOWN_PRIMITIVE';

export type WarningSeverity = 'info' | 'warn' | 'error';

export interface FormatWarning {
  code: WarningCode;
  severity: WarningSeverity;
  message: string;
  nodeId?: string;
  sourceRange?: [number, number];
}

export function makeWarning(
  code: WarningCode,
  severity: WarningSeverity,
  message: string,
  extra?: { nodeId?: string; sourceRange?: [number, number] },
): FormatWarning {
  const w: FormatWarning = { code, severity, message };
  if (extra?.nodeId !== undefined) w.nodeId = extra.nodeId;
  if (extra?.sourceRange !== undefined) w.sourceRange = extra.sourceRange;
  return w;
}
