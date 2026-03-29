import React, { useState, useEffect, useMemo } from 'react';
import { Workflow } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Zap, Copy, Check, Layers, Shield, RotateCcw, Sparkles, Loader2, FileText, AlertCircle, LayoutGrid, ChevronRight } from 'lucide-react';

type IDEType = 'claude' | 'antigravity' | 'cursor';
type OutputType = 'skills' | 'commands' | 'workflows';

interface Props {
  workflow: Workflow;
  workflowName: string | null;
}

const IDE_OPTIONS: { key: IDEType; icon: React.ReactNode; desc: string }[] = [
  { key: 'claude', icon: <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">C</div>, desc: 'Skills & Commands' },
  { key: 'antigravity', icon: <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">A</div>, desc: 'Skills & Workflows' },
  { key: 'cursor', icon: <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">C</div>, desc: 'Skills & Commands' },
];

function getAvailableOutputTypes(ide: IDEType): OutputType[] {
  if (ide === 'antigravity') return ['skills', 'workflows'];
  return ['skills', 'commands'];
}

function getFileLocation(ide: IDEType, outputType: OutputType, name: string): string {
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

function getPrefixKey(ide: IDEType, outputType: OutputType): string {
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

  const [selectedIDE, setSelectedIDE] = useState<IDEType>('claude');
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>('skills');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ content: string; filePath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLight = themeId === 'warm' || themeId === 'minimal';

  useEffect(() => {
    const available = getAvailableOutputTypes(selectedIDE);
    if (!available.includes(selectedOutputType)) {
      setSelectedOutputType(available[0]);
    }
  }, [selectedIDE]);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [selectedIDE, selectedOutputType]);

  const prefix = (t as any)[getPrefixKey(selectedIDE, selectedOutputType)] || '';
  const name = workflowName || workflow.name || 'workflow';
  const filePath = getFileLocation(selectedIDE, selectedOutputType, name);
  const hasNodes = workflow.nodes.length > 0;

  const instructionPrompt = useMemo(() => {
    if (!hasNodes) return '';
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

Output this generated Prompt in professional, rigorous language that is easily understood by other AI Agents.`;
  }, [workflow, hasNodes]);

  const fullPrompt = prefix + instructionPrompt;

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    showToast((t as any).copiedToast || 'Copied to clipboard', 'success');
  };

  const handleGenerate = async () => {
    if (!hasNodes) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          language,
          ide: selectedIDE,
          outputType: selectedOutputType,
          workflowName: name,
          prefix,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ content: data.content, filePath: data.filePath });
        showToast('Instructions generated', 'success');
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    showToast((t as any).copiedFull || 'Full prompt copied', 'success');
  };

  const availableOutputTypes = getAvailableOutputTypes(selectedIDE);

  // Determine wizard step
  const currentStep = result ? 3 : 1;

  const steps = [
    { num: 1, label: (t as any).stepPlatform || 'Select Platform' },
    { num: 2, label: (t as any).stepType || 'Select Type' },
    { num: 3, label: (t as any).stepGenerate || 'Generate' },
  ];

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

  return (
    <div className={`flex-1 flex flex-col ${theme.bgPrimary} overflow-hidden`}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              {i > 0 && <div className={`w-8 h-px ${isLight ? 'bg-stone-300' : 'bg-slate-600'}`} />}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step.num <= currentStep
                    ? `${theme.accentBg} text-white`
                    : isLight ? 'bg-stone-200 text-stone-400' : 'bg-slate-700 text-slate-500'
                }`}>
                  {step.num < currentStep ? <Check size={14} /> : step.num}
                </div>
                <span className={`text-xs font-medium ${step.num <= currentStep ? theme.textPrimary : theme.textMuted}`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* IDE Selector — Large Cards */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>{t.ideLabel}</label>
          <div className="grid grid-cols-3 gap-3">
            {IDE_OPTIONS.map(({ key, icon, desc }) => (
              <button
                key={key}
                onClick={() => setSelectedIDE(key)}
                className={`p-5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                  selectedIDE === key
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

        {/* Output Type — Pill Segmented Control */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>{t.outputTypeLabel}</label>
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

        {/* File Location */}
        <div className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'bg-stone-50 border-stone-200' : `${theme.bgTertiary} ${theme.borderColor}`} rounded-xl border font-mono text-xs ${theme.textMuted}`}>
          <FileText size={12} />
          {filePath}
        </div>

        {/* Generate CTA + Copy */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full py-4 px-8 text-base font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
              generating
                ? 'bg-teal-800/50 text-teal-300 cursor-wait'
                : `${theme.accentBg} ${theme.accentBgHover} text-white shadow-lg shadow-teal-600/20 active:scale-[0.97]`
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {t.generatingInstructions}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap size={18} />
                {result ? t.regenerateInstructions : t.generateInstructions}
              </span>
            )}
          </button>
          <button
            onClick={handleCopyPrompt}
            className={`text-sm ${theme.textMuted} hover:${theme.accentColor} underline underline-offset-4 transition-colors cursor-pointer`}
          >
            {t.copyPrompt}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`p-4 rounded-2xl ${isLight ? 'bg-rose-50 border-rose-200' : 'bg-red-900/20 border-red-500/30'} border text-sm`}>
            <div className={`font-medium mb-1 ${isLight ? 'text-rose-700' : 'text-red-300'}`}>Generation Failed</div>
            <div className={`${isLight ? 'text-rose-600' : 'text-red-400'} opacity-80`}>{error}</div>
            <div className={`mt-2 opacity-60 text-xs ${isLight ? 'text-rose-500' : 'text-red-400'}`}>
              Tip: Use "Copy Prompt" and paste into your AI tool manually.
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-4 ${isLight ? 'bg-teal-50 border-teal-200' : 'bg-teal-900/20 border-teal-500/30'} border rounded-2xl`}>
              <Check size={20} className="text-teal-500 shrink-0" />
              <div className="flex-1">
                <div className={`text-sm font-semibold ${isLight ? 'text-teal-800' : 'text-teal-200'}`}>Generated successfully</div>
                <div className={`text-xs font-mono ${theme.textMuted} mt-0.5`}>{result.filePath}</div>
              </div>
              <button
                onClick={handleCopyResult}
                className={`px-3 py-1.5 text-xs font-medium ${theme.accentBg} text-white rounded-lg transition-all cursor-pointer hover:opacity-90`}
              >
                <Copy size={12} className="inline mr-1" />
                Copy
              </button>
            </div>
            <pre className={`p-4 ${isLight ? 'bg-stone-50 border-stone-200' : `${theme.bgTertiary} ${theme.borderColor}`} rounded-xl border text-xs ${theme.textSecondary} font-mono overflow-auto max-h-[400px] whitespace-pre-wrap leading-relaxed`}>
              {result.content}
            </pre>
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
    </div>
  );
};

export default InstructionsTab;
