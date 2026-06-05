// src/shared/workflowMjsParse.ts
import * as acorn from 'acorn';
import { Workflow, WorkflowNode, NodeType } from './types.js';
import { FormatWarning, makeWarning, WarningCode } from './formatWarning.js';

export interface ParseMjsOptions { fallbackName?: string; }

interface ParseOutcome { workflow: Workflow; warnings: FormatWarning[]; }

function emptyWorkflow(name = ''): Workflow {
  return { name, description: '', nodes: [], edges: [] };
}

/** Pure-literal check over an acorn ObjectExpression / value node. */
export function isPureLiteralMetaNode(node: any): boolean {
  if (!node) return false;
  switch (node.type) {
    case 'Literal':
      return typeof node.value !== 'object' || node.value === null; // no regex (regex has .regex)
    case 'ArrayExpression':
      return node.elements.every((el: any) => el && isPureLiteralMetaNode(el));
    case 'ObjectExpression':
      return node.properties.every((p: any) =>
        p.type === 'Property' && !p.computed && p.kind === 'init' &&
        (p.key.type === 'Identifier' || p.key.type === 'Literal') &&
        isPureLiteralMetaNode(p.value));
    case 'UnaryExpression':
      return node.operator === '-' && node.argument?.type === 'Literal' && typeof node.argument.value === 'number';
    default:
      return false;
  }
}

function literalString(node: any): string | undefined {
  return node && node.type === 'Literal' && typeof node.value === 'string' ? node.value : undefined;
}

let nodeSeq = 0;
function mkNode(type: NodeType, description: string): WorkflowNode {
  nodeSeq += 1;
  return {
    node_id: `n${nodeSeq}`,
    node_type: type,
    title: undefined,
    description,
    inputs: [],
    outputs: [],
    next: [],
    position: { x: 0, y: 0 },
  };
}

/** Extract the single literal-string argument of an `agent("...")` call, if any. */
function agentLiteralArg(call: any): string | undefined {
  if (call?.type !== 'CallExpression') return undefined;
  const callee = call.callee;
  const isAgent = callee?.type === 'Identifier' && callee.name === 'agent';
  if (!isAgent) return undefined;
  return literalString(call.arguments?.[0]);
}

/** Unwrap `await <expr>` → <expr>. */
function unwrapAwait(node: any): any {
  return node?.type === 'AwaitExpression' ? node.argument : node;
}

export function parseWorkflowMjs(content: string, opts: ParseMjsOptions = {}): ParseOutcome {
  nodeSeq = 0;
  const warnings: FormatWarning[] = [];
  let ast: any;
  try {
    ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
  } catch (err: any) {
    return { workflow: emptyWorkflow('Invalid mjs'), warnings: [makeWarning('PARSE_FAILED', 'error', `Invalid .mjs (ESM parse failed): ${err.message}`)] };
  }

  try {
    // --- meta ---
    let name = '';
    let description = '';
    let metaFound = false;
    for (const stmt of ast.body) {
      if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration?.type === 'VariableDeclaration') {
        const decl = stmt.declaration.declarations.find((d: any) => d.id?.name === 'meta');
        if (decl) {
          metaFound = true;
          if (!isPureLiteralMetaNode(decl.init)) {
            warnings.push(makeWarning('NON_LITERAL_META', 'warn', 'meta is not a pure literal; name/description may be incomplete.'));
          }
          if (decl.init?.type === 'ObjectExpression') {
            for (const p of decl.init.properties) {
              const key = p.key?.name ?? p.key?.value;
              if (key === 'name') name = literalString(p.value) ?? '';
              if (key === 'description') description = literalString(p.value) ?? '';
            }
          }
        }
      }
    }
    if (!metaFound) warnings.push(makeWarning('META_MISSING', 'warn', 'No `export const meta` found.'));
    if (!name) name = opts.fallbackName ?? '';

    // --- body: collect orchestration statements at module top level ---
    const nodes: WorkflowNode[] = [];
    const collapse = (code: WarningCode, msg: string, desc: string) => {
      warnings.push(makeWarning(code, 'warn', msg));
      nodes.push(mkNode(NodeType.ScriptExecution, desc));
    };

    for (const stmt of ast.body) {
      // skip the meta export + plain imports/exports
      if (stmt.type === 'ImportDeclaration' || stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration') continue;

      // sequential `await agent("literal")` as a statement or `const x = await agent("literal")`
      let expr: any = null;
      if (stmt.type === 'ExpressionStatement') expr = unwrapAwait(stmt.expression);
      else if (stmt.type === 'VariableDeclaration' && stmt.declarations[0]?.init) expr = unwrapAwait(stmt.declarations[0].init);

      if (expr && expr.type === 'CallExpression') {
        const callee = expr.callee;
        const calleeName = callee?.type === 'Identifier' ? callee.name : (callee?.property?.name);
        const lit = agentLiteralArg(expr);
        if (lit !== undefined) {
          nodes.push(mkNode(NodeType.AgentAction, lit));
          continue;
        }
        if (callee?.type === 'Identifier' && (callee.name === 'agent')) {
          warnings.push(makeWarning('NON_LITERAL_ARGUMENT', 'warn', 'agent() called with a non-literal argument; prompt not recovered.'));
          nodes.push(mkNode(NodeType.AgentAction, '(dynamic prompt)'));
          continue;
        }
        if (calleeName === 'parallel' || calleeName === 'pipeline') {
          collapse('DYNAMIC_FANOUT', `${calleeName}() fan-out is not representable as a static graph; collapsed.`, `(${calleeName} fan-out — see source)`);
          continue;
        }
        if (calleeName === 'phase' || calleeName === 'log') continue; // ignorable
        collapse('UNKNOWN_PRIMITIVE', `Unrecognized call ${calleeName ?? '(anonymous)'}() collapsed.`, `(${calleeName ?? 'call'} — see source)`);
        continue;
      }

      // control flow → collapse to a boundary node with a specific code
      if (stmt.type === 'ForStatement' || stmt.type === 'ForOfStatement' || stmt.type === 'ForInStatement') {
        collapse('LOOP_COLLAPSED', 'A loop was collapsed; dynamic iteration is not representable as a static graph.', '(loop — see source)');
        continue;
      }
      if (stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement') {
        collapse('BUDGET_LOOP_COLLAPSED', 'A while/budget loop was collapsed.', '(while loop — see source)');
        continue;
      }
      if (stmt.type === 'IfStatement') {
        collapse('BRANCH_COLLAPSED', 'An if/else branch was collapsed; v1 import does not reconstruct branch graphs.', '(if/else branch — see source)');
        continue;
      }
      // anything else with no recognizable orchestration → ignore silently
      if (stmt.type === 'FunctionDeclaration') {
        warnings.push(makeWarning('UNSUPPORTED_CONTROL_FLOW', 'info', 'A helper function was not inlined; its agent calls (if any) were not extracted.'));
        continue;
      }
    }

    // wire linearly
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = [nodes[i + 1].node_id];

    if (nodes.length === 0) {
      warnings.push(makeWarning('DATAFLOW_LOST', 'info', 'No top-level orchestration calls were recovered.'));
    }

    return { workflow: { name, description, nodes, edges: [] }, warnings };
  } catch (err: any) {
    // walker bug / unexpected node shape — never throw
    return { workflow: emptyWorkflow(opts.fallbackName ?? ''), warnings: [makeWarning('PARSE_FAILED', 'error', `Unexpected error walking .mjs: ${err.message}`)] };
  }
}
