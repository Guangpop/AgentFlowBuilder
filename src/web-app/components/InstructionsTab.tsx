import React, { useState, useEffect, useMemo } from 'react';
import { Workflow } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, Copy, Check, Layers, Shield, RotateCcw, Sparkles, Loader2, FileText, AlertCircle } from 'lucide-react';

type IDEType = 'claude' | 'antigravity' | 'cursor';
type OutputType = 'skills' | 'commands' | 'workflows';

interface Props {
  workflow: Workflow;
  workflowName: string | null;
}

const IDE_OPTIONS: { key: IDEType; icon: string }[] = [
  { key: 'claude', icon: '◆' },
  { key: 'antigravity', icon: '▲' },
  { key: 'cursor', icon: '●' },
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

  const [selectedIDE, setSelectedIDE] = useState<IDEType>('claude');
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>('skills');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ content: string; filePath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  // Reset output type when IDE changes
  useEffect(() => {
    const available = getAvailableOutputTypes(selectedIDE);
    if (!available.includes(selectedOutputType)) {
      setSelectedOutputType(available[0]);
    }
  }, [selectedIDE]);

  // Reset result when selections change
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [selectedIDE, selectedOutputType]);

  const prefix = (t as any)[getPrefixKey(selectedIDE, selectedOutputType)] || '';
  const name = workflowName || workflow.name || 'workflow';
  const filePath = getFileLocation(selectedIDE, selectedOutputType, name);
  const hasNodes = workflow.nodes.length > 0;

  // Generate instruction prompt locally (no LLM)
  const instructionPrompt = useMemo(() => {
    if (!hasNodes) return '';
    const cleanWorkflow = {
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes.map(({ position, ...rest }) => rest),
      edges: workflow.edges,
    };
    const workflowJson = JSON.stringify(cleanWorkflow, null, 2);

    // Use the agentInstructionsPrompt from shared prompts via dynamic import isn't possible in browser
    // So we inline a simplified version that embeds workflow JSON
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
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
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
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const availableOutputTypes = getAvailableOutputTypes(selectedIDE);

  const features = [
    { icon: <Layers size={16} />, title: t.featureHierarchical, desc: t.featureHierarchicalDesc, color: 'blue' },
    { icon: <Shield size={16} />, title: t.featureAntiPollution, desc: t.featureAntiPollutionDesc, color: 'emerald' },
    { icon: <RotateCcw size={16} />, title: t.featureFeedbackLoop, desc: t.featureFeedbackLoopDesc, color: 'purple' },
  ];

  if (!hasNodes) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${theme.bgPrimary} p-8`}>
        <AlertCircle size={48} className={`${theme.textMuted} mb-4`} />
        <p className={`text-sm ${theme.textMuted}`}>
          Load or create a workflow first to generate instructions.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${theme.bgPrimary} overflow-hidden`}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* Title */}
        <div>
          <h2 className={`text-lg font-bold ${theme.textPrimary} flex items-center gap-2`}>
            <Sparkles size={20} className="text-blue-500" />
            {t.instructionsTitle}
          </h2>
          <p className={`text-xs ${theme.textMuted} mt-1`}>{t.instructionsDescription}</p>
        </div>

        {/* IDE Selector */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>{t.ideLabel}</label>
          <div className="flex gap-2">
            {IDE_OPTIONS.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => setSelectedIDE(key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium ${theme.borderRadius} border transition-all ${
                  selectedIDE === key
                    ? `border-blue-500 ${themeId === 'minimal' ? 'bg-blue-50 text-blue-900' : 'bg-blue-900/20 text-blue-200'} ring-2 ring-blue-500/20`
                    : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover} ${theme.textPrimary}`
                }`}
              >
                <span className="text-base">{icon}</span>
                {(t as any)[`ide${key.charAt(0).toUpperCase() + key.slice(1)}${key === 'claude' ? 'Code' : ''}`] || key}
              </button>
            ))}
          </div>
        </div>

        {/* Output Type Selector */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>{t.outputTypeLabel}</label>
          <div className="flex gap-2">
            {availableOutputTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedOutputType(type)}
                className={`flex-1 px-3 py-2 text-xs font-medium ${theme.borderRadius} border transition-all ${
                  selectedOutputType === type
                    ? `border-emerald-500 ${themeId === 'minimal' ? 'bg-emerald-50 text-emerald-900' : 'bg-emerald-900/20 text-emerald-200'} ring-2 ring-emerald-500/20`
                    : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover} ${theme.textPrimary}`
                }`}
              >
                {(t as any)[`outputType${type.charAt(0).toUpperCase() + type.slice(1)}`] || type}
              </button>
            ))}
          </div>
        </div>

        {/* File Location */}
        <div className="space-y-1.5">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>{t.fileLocationLabel}</label>
          <div className={`px-3 py-2 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColor} font-mono text-xs ${theme.textSecondary}`}>
            {filePath}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium ${theme.borderRadius} transition-all ${
              generating
                ? 'bg-blue-800/50 text-blue-300 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t.generatingInstructions}
              </>
            ) : (
              <>
                <Zap size={16} />
                {result ? t.regenerateInstructions : t.generateInstructions}
              </>
            )}
          </button>
          <button
            onClick={handleCopyPrompt}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
          >
            {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
            {copiedPrompt ? t.copied : t.copyPrompt}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`p-3 ${theme.borderRadius} bg-red-900/20 border border-red-500/30 text-red-300 text-xs`}>
            <div className="font-medium mb-1">Generation Failed</div>
            <div className="opacity-80">{error}</div>
            <div className="mt-2 opacity-60">Tip: Use "Copy Prompt" and paste into your AI tool manually.</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
                {t.generatedPrompt}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${theme.textMuted} font-mono`}>
                  <FileText size={10} className="inline mr-1" />
                  {result.filePath}
                </span>
                <button
                  onClick={handleCopyResult}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
                >
                  {copiedFull ? <Check size={10} /> : <Copy size={10} />}
                  {copiedFull ? t.copiedFull : t.copyFullPrompt}
                </button>
              </div>
            </div>
            <pre className={`p-4 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColor} text-xs ${theme.textSecondary} font-mono overflow-auto max-h-[400px] whitespace-pre-wrap leading-relaxed`}>
              {result.content}
            </pre>
          </div>
        )}

        {/* Prefix Preview (when no result yet) */}
        {!result && (
          <div className="space-y-2">
            <span className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
              Prefix Template Preview
            </span>
            <pre className={`p-3 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColor} text-xs ${theme.textMuted} font-mono whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-auto`}>
              {prefix}
            </pre>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className={`p-3 ${theme.borderRadius} border ${theme.borderColor} ${theme.bgCard} space-y-1.5`}
            >
              <div className={`flex items-center gap-1.5 text-${f.color}-400`}>
                {f.icon}
                <span className={`text-[10px] font-bold uppercase tracking-wider`}>{f.title}</span>
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
