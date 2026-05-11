import React, { useState, useEffect, useMemo } from 'react';
import { Workflow } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Copy, Check, Layers, Shield, RotateCcw, FileText, LayoutGrid, AlertTriangle, X, MessageSquare } from 'lucide-react';
import { buildChatPrompt, ChatMode } from '@shared/prompts/chatPrompt';

type Platform = 'claude' | 'antigravity' | 'cursor' | 'chat';
type IDEPlatform = Exclude<Platform, 'chat'>;
type OutputType = 'skills' | 'commands' | 'workflows';

interface Props {
  workflow: Workflow;
  workflowName: string | null;
}

const IDE_OPTIONS: { key: IDEPlatform; icon: React.ReactNode; desc: string }[] = [
  { key: 'claude', icon: <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">C</div>, desc: 'Skills & Commands' },
  { key: 'antigravity', icon: <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">A</div>, desc: 'Skills & Workflows' },
  { key: 'cursor', icon: <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">C</div>, desc: 'Skills & Commands' },
];

function getAvailableOutputTypes(ide: IDEPlatform): OutputType[] {
  if (ide === 'antigravity') return ['skills', 'workflows'];
  return ['skills', 'commands'];
}

function getFileLocation(ide: IDEPlatform, outputType: OutputType, name: string): string {
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const map: Record<string, string> = {
    'claude:skills': `.claude/skills/${safeName}/SKILL.md`,
    'claude:commands': `.claude/commands/${safeName}.md`,
    'antigravity:skills': `.agent/skills/${safeName}/SKILL.md`,
    'antigravity:workflows': `.agent/workflows/${safeName}.md`,
    'cursor:skills': `.cursor/skills/${safeName}/SKILL.md`,
    'cursor:commands': `.cursor/commands/${safeName}.md`,
  };
  return map[`${ide}:${outputType}`] || '';
}

function getPrefixKey(ide: IDEPlatform, outputType: OutputType): string {
  const map: Record<string, string> = {
    'claude:skills': 'prefixClaudeSkills',
    'claude:commands': 'prefixClaudeCommands',
    'antigravity:skills': 'prefixAntigravitySkills',
    'antigravity:workflows': 'prefixAntigravityWorkflows',
    'cursor:skills': 'prefixCursorSkills',
    'cursor:commands': 'prefixCursorCommands',
  };
  return map[`${ide}:${outputType}`] || 'prefixClaudeSkills';
}

const InstructionsTab: React.FC<Props> = ({ workflow, workflowName }) => {
  const { theme, themeId, t, language } = useTheme();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'ide' | 'chat'>('ide');
  const [selectedIde, setSelectedIde] = useState<IDEPlatform>('claude');
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>('skills');
  const [selectedChatMode, setSelectedChatMode] = useState<ChatMode>('step');
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isLight = themeId === 'warm' || themeId === 'minimal';
  const isChat = viewMode === 'chat';

  useEffect(() => {
    if (isChat) return;
    const available = getAvailableOutputTypes(selectedIde);
    if (!available.includes(selectedOutputType)) {
      setSelectedOutputType(available[0]);
    }
  }, [selectedIde, isChat, selectedOutputType]);

  useEffect(() => {
    setCopied(false);
  }, [viewMode, selectedIde, selectedOutputType, selectedChatMode]);

  const name = workflowName || workflow.name || 'workflow';
  const hasNodes = workflow.nodes.length > 0;
  const filePath = isChat ? '' : getFileLocation(selectedIde, selectedOutputType, name);

  // IDE-mode prompt (legacy hierarchical instruction)
  const instructionPrompt = useMemo(() => {
    if (!hasNodes || isChat) return '';
    const cleanWorkflow = {
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes.map(({ position, ...rest }) => rest),
      edges: workflow.edges,
    };
    const workflowJson = JSON.stringify(cleanWorkflow, null, 2);

    return `You are a senior AI Agent architect and Prompt engineering expert.
Your task is to convert a visual workflow into precise, highly structured "Agent Execution Instructions (Master Instructions)".

These instructions must follow the "Hierarchical Disclosure" principle to address:
1. Preventing Attention Drift
2. Preventing Context Pollution
3. Handling Context Window sliding truncation issues

Current visual workflow data (JSON):
${workflowJson}

Generate a Prompt that includes:
1. **Role Definition**: Define the Agent's role and core mission.
2. **Standard Operating Procedure (SOP)**: Break down the workflow into clear execution stages.
3. **Skill Modules**: Define atomic skills the Agent should possess based on node types.
4. **State Management & Feedback Loops**: Clearly explain how to handle "Loop Back" logic.
5. **Context Protocol**: Instruct the Agent on how to clean up unnecessary history.

Output this generated Prompt in professional, rigorous language that is easily understood by other AI Agents.

---

## Skill Quality Gate (MANDATORY)

After generating the skill/command file, you MUST use the following skills to ensure quality. Do NOT skip this step. Do NOT ask the user for confirmation during the loop.

### Required Skills (located in the AgentFlow Builder project)

- **skill-grader** at \`.claude/skills/skill-grader/\` — Read its SKILL.md and references/scoring-rubric.md for the complete 6-pillar 100-point evaluation process.
- **skill-creator** at \`.claude/skills/skill-creator/\` — Read its SKILL.md for skill creation best practices, improvement patterns, and description optimization (scripts/improve_description.py).

### Quality Gate Loop

1. **Grade**: Use the skill-grader skill to evaluate the generated SKILL.md. Follow its complete process: scope compliance pre-check, score all 6 pillars, assess PDA tier.
2. **Pass threshold**: Score must be >= 80/100 (Grade B).
3. **If below 80**: Use the skill-creator skill for improvement guidance. Apply targeted improvements, then re-grade. Repeat up to 3 times.
4. **Optimize description**: After passing (or after 3 iterations), use the skill-creator's description optimization process to improve trigger accuracy — include both English and Traditional Chinese trigger phrases.
5. **Save**: Write the final SKILL.md to the target file path. If you have access to the AgentFlow Builder MCP server, call \`publish_skill\` to also save to ~/.claude/skills/ for cross-project discovery.
6. **Report**: Tell the user the final score and grade.`;
  }, [workflow, hasNodes, isChat]);

  // Chat-mode prompt (self-contained, no MCP)
  const chatPromptText = useMemo(() => {
    if (!hasNodes || !isChat) return '';
    return buildChatPrompt(workflow, selectedChatMode, language);
  }, [workflow, hasNodes, isChat, selectedChatMode, language]);

  const idePrefix = !isChat ? (t as any)[getPrefixKey(selectedIde, selectedOutputType)] || '' : '';
  const fullPrompt = isChat ? chatPromptText : idePrefix + instructionPrompt;

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    showToast((t as any).copiedToast || 'Copied to clipboard', 'success');
    if (!isChat) setShowModal(true); // Quality-gate hint only for IDE flows
    setTimeout(() => setCopied(false), 3000);
  };

  const availableOutputTypes = !isChat ? getAvailableOutputTypes(selectedIde) : [];

  if (!hasNodes) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${theme.bgPrimary} p-8 gap-4`}>
        <div className={`p-4 rounded-2xl ${isLight ? 'bg-stone-100' : 'bg-slate-800'}`}>
          <LayoutGrid size={40} className={`${theme.textMuted} opacity-40`} />
        </div>
        <p className={`text-base font-semibold ${theme.textSecondary}`}>
          {(t as any).noWorkflowForInstructions || 'Build a workflow first, then generate instructions'}
        </p>
        <p className={`text-sm ${theme.textMuted}`}>
          {(t as any).goToCanvas || 'Go to Canvas'}
        </p>
      </div>
    );
  }

  const groupLabelClasses = `text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`;

  return (
    <div className={`flex-1 flex flex-col ${theme.bgPrimary} overflow-hidden`}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Top-level mode tab: IDE vs Chat */}
        <div
          role="tablist"
          aria-label="Output target"
          className={`grid grid-cols-2 gap-1 p-1 rounded-2xl ${isLight ? 'bg-stone-100' : 'bg-slate-800/60'}`}
        >
          {([
            {
              key: 'ide' as const,
              title: (t as any).platformGroupIde || 'IDE',
              hint:  (t as any).platformGroupIdeHint || 'Requires IDE + MCP',
            },
            {
              key: 'chat' as const,
              title: (t as any).platformGroupChat || 'Chat',
              hint:  (t as any).platformGroupChatHint || 'Just paste into a chatbox',
            },
          ]).map(({ key, title, hint }) => {
            const active = viewMode === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(key)}
                className={`px-5 py-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  active
                    ? isLight
                      ? 'bg-white shadow-sm'
                      : 'bg-slate-700 shadow-sm'
                    : `bg-transparent hover:${isLight ? 'bg-white/50' : 'bg-slate-700/40'}`
                }`}
              >
                <div className={`text-sm font-bold ${active ? theme.textPrimary : theme.textMuted}`}>{title}</div>
                <div className={`text-[11px] mt-0.5 ${active ? theme.textSecondary : theme.textMuted}`}>{hint}</div>
              </button>
            );
          })}
        </div>

        {/* IDE-mode: pick IDE (3 cards) */}
        {!isChat && (
          <div className="space-y-2">
            <label className={groupLabelClasses}>{t.ideLabel}</label>
            <div className="grid grid-cols-3 gap-3">
              {IDE_OPTIONS.map(({ key, icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setSelectedIde(key)}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                    selectedIde === key
                      ? isLight
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-teal-400 bg-teal-900/20 shadow-md'
                      : isLight
                        ? 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                        : `border-slate-700 ${theme.bgCard} hover:border-slate-500`
                  }`}
                >
                  <div className="mb-3">{icon}</div>
                  <div className={`text-base font-bold ${theme.textPrimary}`}>
                    {(t as any)[`ide${key.charAt(0).toUpperCase() + key.slice(1)}${key === 'claude' ? 'Code' : ''}`] || key}
                  </div>
                  <div className={`text-xs ${theme.textMuted} mt-0.5`}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat-mode: target list (informational, single card) */}
        {isChat && (
          <div className={`p-5 rounded-2xl border ${theme.borderColor} ${theme.bgCard} flex items-center gap-4`}>
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-white">
              <MessageSquare size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-bold ${theme.textPrimary}`}>
                {(t as any).chatPlatformDesc || 'ChatGPT · Gemini · Grok · Claude.ai · DeepSeek'}
              </div>
              <div className={`text-xs ${theme.textMuted} mt-0.5`}>
                {(t as any).platformGroupChatHint || 'Just paste into a chatbox'}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Output Type (IDE) or Chat Mode (Chat) */}
        {isChat ? (
          <div className="space-y-2">
            <label className={groupLabelClasses}>{(t as any).modeLabel || 'Execution mode'}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['step', 'plan'] as ChatMode[]).map((mode) => {
                const active = selectedChatMode === mode;
                const title = mode === 'step' ? ((t as any).chatModeStep || 'Step-by-step') : ((t as any).chatModePlan || 'Plan-then-Execute');
                const desc  = mode === 'step' ? ((t as any).chatModeStepDesc || 'Pauses at each stage') : ((t as any).chatModePlanDesc || 'Shows plan, waits for GO');
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedChatMode(mode)}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                      active
                        ? isLight
                          ? 'border-teal-500 bg-teal-50 shadow-md'
                          : 'border-teal-400 bg-teal-900/20 shadow-md'
                        : isLight
                          ? 'border-stone-200 bg-white hover:border-stone-300'
                          : `border-slate-700 ${theme.bgCard} hover:border-slate-500`
                    }`}
                  >
                    <div className={`text-sm font-bold ${theme.textPrimary}`}>{title}</div>
                    <div className={`text-xs ${theme.textMuted} mt-1 leading-relaxed`}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className={groupLabelClasses}>{t.outputTypeLabel}</label>
            <div className={`inline-flex ${isLight ? 'bg-stone-100' : 'bg-slate-800'} rounded-xl p-1 gap-1`}>
              {availableOutputTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOutputType(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                    selectedOutputType === type
                      ? isLight
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'bg-slate-700 text-white shadow-sm'
                      : `${theme.textMuted} hover:${theme.textSecondary}`
                  }`}
                >
                  {(t as any)[`outputType${type.charAt(0).toUpperCase() + type.slice(1)}`] || type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Location — IDE only */}
        {!isChat && (
          <div className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'bg-stone-50 border-stone-200' : `${theme.bgTertiary} ${theme.borderColor}`} rounded-xl border font-mono text-xs ${theme.textMuted}`}>
            <FileText size={12} />
            {filePath}
          </div>
        )}

        {/* Copy Prompt CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleCopyPrompt}
            className={`w-full py-4 px-8 text-base font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
              copied
                ? isLight ? 'bg-teal-100 text-teal-700 border-2 border-teal-300' : 'bg-teal-900/30 text-teal-300 border-2 border-teal-500/30'
                : `${theme.accentBg} ${theme.accentBgHover} text-white shadow-lg shadow-teal-600/20 active:scale-[0.97]`
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied
                ? (t.copied || 'Copied')
                : (isChat ? ((t as any).copyChatPrompt || 'Copy Chat Prompt') : (t.copyPrompt || 'Copy Prompt'))}
            </span>
          </button>
          <p className={`text-xs ${theme.textMuted} text-center leading-relaxed`}>
            {isChat
              ? ((t as any).chatHint || 'Paste this prompt into any LLM chat')
              : ((t as any).copyPromptHint || 'Paste this prompt into Claude Code, Cursor, or Codex to generate your skill/command')}
          </p>
        </div>

        {/* Copied success (Chat) — no quality-gate modal, just a small banner */}
        {copied && isChat && (
          <div className={`flex items-center gap-3 p-4 ${isLight ? 'bg-teal-50 border-teal-200' : 'bg-teal-900/20 border-teal-500/30'} border rounded-2xl`}>
            <Check size={20} className="text-teal-500 shrink-0" />
            <div className="flex-1">
              <div className={`text-sm font-semibold ${isLight ? 'text-teal-800' : 'text-teal-200'}`}>
                {(t as any).promptCopiedTitle || (language === 'zh-TW' ? 'Prompt 已複製到剪貼簿' : 'Prompt copied to clipboard')}
              </div>
              <div className={`text-xs ${theme.textMuted} mt-1`}>
                {(t as any).chatHint || 'Paste this prompt into any LLM chat'}
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Layers size={16} />, title: t.featureHierarchical, desc: t.featureHierarchicalDesc, color: isLight ? 'text-teal-600' : 'text-blue-400' },
            { icon: <Shield size={16} />, title: t.featureAntiPollution, desc: t.featureAntiPollutionDesc, color: isLight ? 'text-amber-600' : 'text-emerald-400' },
            { icon: <RotateCcw size={16} />, title: t.featureFeedbackLoop, desc: t.featureFeedbackLoopDesc, color: isLight ? 'text-purple-600' : 'text-purple-400' },
          ].map((f, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border ${theme.borderColor} ${theme.bgCard} space-y-2`}
            >
              <div className={`flex items-center gap-1.5 ${f.color}`}>
                {f.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{f.title}</span>
              </div>
              <p className={`text-[10px] ${theme.textMuted} leading-relaxed`}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Gate Modal — only for IDE flows */}
      {showModal && !isChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-md rounded-3xl border-2 shadow-2xl ${
              isLight
                ? 'bg-white border-amber-300'
                : 'bg-slate-900 border-amber-500/40'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className={`absolute top-4 right-4 p-1 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-stone-100 text-stone-400' : 'hover:bg-slate-800 text-slate-500'
              }`}
            >
              <X size={18} />
            </button>

            <div className="p-6 space-y-4">
              {/* Icon + Title */}
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isLight ? 'bg-amber-100' : 'bg-amber-900/30'}`}>
                  <AlertTriangle size={24} className={isLight ? 'text-amber-600' : 'text-amber-400'} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${theme.textPrimary}`}>
                    {language === 'zh-TW' ? 'Prompt 已複製！' : 'Prompt Copied!'}
                  </h3>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {language === 'zh-TW' ? '請注意以下執行步驟' : 'Please follow these steps'}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className={`space-y-3 p-4 rounded-2xl ${isLight ? 'bg-amber-50' : 'bg-amber-900/10'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isLight ? 'bg-amber-200 text-amber-800' : 'bg-amber-800/50 text-amber-300'
                  }`}>1</div>
                  <p className={`text-sm ${theme.textPrimary}`}>
                    {language === 'zh-TW'
                      ? <>切換到 <span className="font-mono font-bold">AgentFlow Builder</span> 專案目錄</>
                      : <>Switch to the <span className="font-mono font-bold">AgentFlow Builder</span> project directory</>
                    }
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isLight ? 'bg-amber-200 text-amber-800' : 'bg-amber-800/50 text-amber-300'
                  }`}>2</div>
                  <p className={`text-sm ${theme.textPrimary}`}>
                    {language === 'zh-TW'
                      ? '將 Prompt 貼上到 AI 工具（Claude Code、Cursor、Codex 等）'
                      : 'Paste the prompt into your AI tool (Claude Code, Cursor, Codex, etc.)'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isLight ? 'bg-amber-200 text-amber-800' : 'bg-amber-800/50 text-amber-300'
                  }`}>3</div>
                  <p className={`text-sm ${theme.textPrimary}`}>
                    {language === 'zh-TW'
                      ? 'AI 會自動產出 Skill → 評分 → 迭代改善 → 發佈至全域目錄'
                      : 'AI will auto-generate Skill → Grade → Iterate → Publish to global directory'}
                  </p>
                </div>
              </div>

              {/* Why */}
              <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                {language === 'zh-TW'
                  ? '此 Prompt 需要 AgentFlow MCP Server 的工具支援（convert_to_skill、get_skill_quality_gate、publish_skill），只有在本專案目錄下才能使用。'
                  : 'This prompt requires AgentFlow MCP Server tools (convert_to_skill, get_skill_quality_gate, publish_skill), which are only available in this project directory.'}
              </p>

              {/* OK Button */}
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  isLight
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {language === 'zh-TW' ? '我知道了' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionsTab;
