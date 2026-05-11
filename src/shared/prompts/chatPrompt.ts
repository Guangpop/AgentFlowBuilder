import { Workflow, WorkflowNode, NodeType } from '../types.js';
import { topologicalSort } from '../skillConverter.js';
import { Language } from './index.js';

export type ChatMode = 'step' | 'plan';

/**
 * Build a self-contained prompt suitable for pasting into a generic LLM
 * chat interface (ChatGPT, Gemini, Grok, Claude.ai, DeepSeek). The output
 * has zero dependencies on MCP, IDEs, or local file paths — the entire
 * SOP is inlined as markdown.
 */
export function buildChatPrompt(
  workflow: Workflow,
  mode: ChatMode,
  lang: Language
): string {
  const isZh = lang === 'zh-TW';
  const sorted = topologicalSort(workflow.nodes);
  const stageIndex = new Map<string, number>();
  sorted.forEach((n, i) => stageIndex.set(n.node_id, i + 1));

  const sections: string[] = [];
  sections.push(renderHeader(workflow, isZh));
  sections.push(renderOperatingRules(mode, isZh));
  sections.push(renderSOP(sorted, stageIndex, isZh));
  const branchTable = renderBranchTable(sorted, stageIndex, isZh);
  if (branchTable) sections.push(branchTable);
  sections.push(renderFooter(mode, isZh));

  return sections.join('\n\n---\n\n');
}

function renderHeader(workflow: Workflow, isZh: boolean): string {
  const title = workflow.name || (isZh ? '未命名流程' : 'Untitled Workflow');
  const roleHeading = isZh ? '## 你的角色' : '## Your Role';
  const fallbackRole = isZh
    ? '請依照下方標準作業程序執行。'
    : 'Follow the standard operating procedure below.';
  const role = workflow.description?.trim() || fallbackRole;
  return `# ${title}\n\n${roleHeading}\n\n${role}`;
}

function renderOperatingRules(mode: ChatMode, isZh: boolean): string {
  if (isZh) {
    const common = [
      '## 執行規則',
      '',
      '- **嚴格遵守下方 SOP**：不可跳步、不可自行發揮。',
      '- 若任何環節不清楚，**停下來問使用者**，不要猜。',
      '- 遇到 Condition 階段，**明確說明**你判斷的結果是 TRUE 還是 FALSE，再走對應分支。',
      '- 若流程包含 loop，回頭時**先說「回到 Stage X」**再執行。',
      '- 遇到工具型階段（MCPTool / AgentSkill / ScriptExecution）：你**沒有實際工具可用**——請描述「你會怎麼做」，或直接請使用者提供該步驟的結果。',
    ];
    if (mode === 'step') {
      common.push(
        '',
        '**互動模式：一次只執行一個 Stage**。每完成一個 Stage 就回報結果，然後等使用者說「next」或「下一步」再繼續。'
      );
    } else {
      common.push(
        '',
        '**互動模式：先計畫再執行**。第一輪請先把**整段計畫**（所有 Stage、分支邏輯、預期輸入/輸出）攤開給使用者看。然後等使用者說「GO」或「開始」，再依序執行；只在需要使用者輸入時暫停。'
      );
    }
    return common.join('\n');
  }
  const common = [
    '## Operating Rules',
    '',
    '- **Follow the SOP exactly.** Do NOT skip stages. Do NOT improvise.',
    '- If any part is unclear, **STOP and ask the user.** Do not guess.',
    '- For Condition stages, **explicitly announce** whether you evaluated TRUE or FALSE, then take the matching branch.',
    '- For loops, when looping back **say "Returning to Stage X" first**, then execute.',
    '- For tool stages (MCPTool / AgentSkill / ScriptExecution): you **do NOT have the actual tool** here — describe what you WOULD do, or ask the user to provide the step\'s result.',
  ];
  if (mode === 'step') {
    common.push(
      '',
      '**Interaction mode: ONE stage at a time.** After each stage, report the outcome and **wait for the user to say "next"** before continuing.'
    );
  } else {
    common.push(
      '',
      '**Interaction mode: plan first, then execute.** In your FIRST reply, lay out the **complete plan** (all stages, branching, expected inputs/outputs). Then wait for the user to say **"GO"**. Then execute the plan, pausing only when user input is required.'
    );
  }
  return common.join('\n');
}

function renderSOP(
  sorted: WorkflowNode[],
  stageIndex: Map<string, number>,
  isZh: boolean
): string {
  const heading = isZh ? '## 標準作業程序 (SOP)' : '## Standard Operating Procedure';
  const blocks: string[] = [heading];
  sorted.forEach((node, i) => {
    blocks.push(renderStage(node, i + 1, stageIndex, isZh));
  });
  return blocks.join('\n\n');
}

function renderStage(
  node: WorkflowNode,
  stageNum: number,
  stageIndex: Map<string, number>,
  isZh: boolean
): string {
  const title = (node.title && node.title.trim()) || node.node_id;
  const lines: string[] = [];
  lines.push(`### Stage ${stageNum}: ${title}  · \`${node.node_type}\``);
  if (node.description?.trim()) {
    lines.push('', node.description.trim());
  }

  const inputsLabel = isZh ? '輸入' : 'Inputs';
  const outputsLabel = isZh ? '輸出' : 'Outputs';
  const inputs = (node.inputs || []).join(', ') || '—';
  const outputs = (node.outputs || []).join(', ') || '—';
  lines.push('', `**${inputsLabel}:** ${inputs}`, `**${outputsLabel}:** ${outputs}`);

  // Type-specific add-ons
  if (node.node_type === NodeType.Condition) {
    const trueId = node.next[0];
    const falseId = node.next[1];
    const trueStage = trueId ? stageIndex.get(trueId) : undefined;
    const falseStage = falseId ? stageIndex.get(falseId) : undefined;
    const trueLabel = isZh ? '判斷為 TRUE' : 'If TRUE';
    const falseLabel = isZh ? '判斷為 FALSE' : 'If FALSE';
    const branchHeading = isZh ? '**分支**：' : '**Branching:**';
    lines.push('', branchHeading);
    lines.push(`- ${trueLabel} → ${formatStageRef(trueId, trueStage, isZh)}`);
    lines.push(`- ${falseLabel} → ${formatStageRef(falseId, falseStage, isZh)}`);
  } else if (
    node.node_type === NodeType.UserInput ||
    node.node_type === NodeType.AgentQuestion
  ) {
    const note = isZh
      ? '**在此暫停。** 主動向使用者提問，拿到答案後再進入下一階段。'
      : '**Pause here.** Proactively ask the user; resume only after you have their answer.';
    lines.push('', note);
  } else if (
    node.node_type === NodeType.MCPTool ||
    node.node_type === NodeType.ScriptExecution ||
    node.node_type === NodeType.AgentSkill
  ) {
    const toolName =
      (node.config?.toolName as string) ||
      (node.config?.skill_name as string) ||
      (node.config?.skillName as string) ||
      (node.config?.scriptType as string) ||
      '';
    const ref = toolName ? `\`${toolName}\`` : '';
    const note = isZh
      ? `**工具階段。**${ref ? ` 預期工具：${ref}。` : ''} 在此聊天環境你沒有實際工具——請依輸入描述「你會怎麼做 / 預期工具回傳什麼」，或請使用者提供該步驟的結果。`
      : `**Tool stage.**${ref ? ` Expected tool: ${ref}.` : ''} You don't have the actual tool here — describe what you WOULD do (or what the tool would return for the given inputs), or ask the user to supply the result.`;
    lines.push('', note);
  } else if (node.node_type === NodeType.UserResponse) {
    const note = isZh
      ? '**回應給使用者。** 用清楚的格式總結此階段結果。'
      : '**Reply to the user.** Summarize the result of this stage clearly.';
    lines.push('', note);
  }

  // Next pointer (for non-Condition multi-next nodes)
  if (node.node_type !== NodeType.Condition && node.next.length > 0) {
    const validNexts = node.next.filter(Boolean);
    if (validNexts.length === 1) {
      const target = stageIndex.get(validNexts[0]);
      const label = isZh ? '**下一階段：**' : '**Next:**';
      lines.push('', `${label} ${formatStageRef(validNexts[0], target, isZh)}`);
    } else if (validNexts.length > 1) {
      const label = isZh ? '**可能下一階段：**' : '**Possible next stages:**';
      lines.push('', label);
      validNexts.forEach((id, idx) => {
        const target = stageIndex.get(id);
        lines.push(`- (${idx + 1}) ${formatStageRef(id, target, isZh)}`);
      });
    }
  } else if (node.next.length === 0) {
    const note = isZh ? '**🏁 終點。** 完成後流程結束。' : '**🏁 Terminal stage.** End of workflow.';
    lines.push('', note);
  }

  return lines.join('\n');
}

function formatStageRef(
  nodeId: string | undefined,
  stage: number | undefined,
  isZh: boolean
): string {
  if (!nodeId) return isZh ? '（未連接）' : '(not connected)';
  if (!stage) return `\`${nodeId}\``;
  return `Stage ${stage} (\`${nodeId}\`)`;
}

function renderBranchTable(
  sorted: WorkflowNode[],
  stageIndex: Map<string, number>,
  isZh: boolean
): string {
  const conditions = sorted.filter((n) => n.node_type === NodeType.Condition);
  if (conditions.length === 0) return '';

  const heading = isZh ? '## 分支總覽' : '## Branching Quick Reference';
  const cols = isZh
    ? '| 階段 | 條件 | TRUE → | FALSE → |'
    : '| At Stage | Condition | TRUE → | FALSE → |';
  const sep = '| --- | --- | --- | --- |';
  const rows: string[] = [heading, '', cols, sep];

  for (const node of conditions) {
    const stage = stageIndex.get(node.node_id);
    const title = (node.title && node.title.trim()) || node.node_id;
    const desc = (node.description?.trim().replace(/\n+/g, ' ').slice(0, 80)) || '—';
    const trueId = node.next[0];
    const falseId = node.next[1];
    rows.push(
      `| Stage ${stage} (${title}) | ${desc} | ${formatStageRef(trueId, stageIndex.get(trueId || ''), isZh)} | ${formatStageRef(falseId, stageIndex.get(falseId || ''), isZh)} |`
    );
  }
  return rows.join('\n');
}

function renderFooter(mode: ChatMode, isZh: boolean): string {
  if (mode === 'step') {
    return isZh
      ? '## 開始\n\n從 Stage 1 開始。先用一句話覆述 Stage 1 的目標確認你已理解，再進入該階段執行。'
      : '## Now Begin\n\nStart with Stage 1. Confirm understanding by restating its goal in one sentence, then proceed.';
  }
  return isZh
    ? '## 開始\n\n第一輪請先把完整計畫攤開給我（含所有 Stage、分支邏輯、預期輸入/輸出）。等我回「GO」再開始執行。'
    : '## Now Begin\n\nIn your first reply, present the complete plan (all stages, branching, expected inputs/outputs). Wait for me to say "GO" before executing.';
}
