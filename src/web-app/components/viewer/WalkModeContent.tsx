import React from 'react';
import { ArrowLeft, Flag, RotateCw } from 'lucide-react';
import { Workflow, WorkflowNode, NodeType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { NodeTypeChip } from './NodeTypeChip';
import { renderMarkdown } from './viewerUtils';

interface Props {
  workflow: Workflow;
  nodeIndex: Map<string, WorkflowNode>;
  currentId: string | null;
  trail: string[];
  isLight: boolean;
  onAdvance: (targetId: string) => void;
  onPrev: () => void;
  onReset: () => void;
}

export function WalkModeContent(props: Props) {
  return <WalkCardInner {...props} />;
}

function WalkCardInner({
  workflow,
  nodeIndex,
  currentId,
  trail,
  isLight,
  onAdvance,
  onPrev,
  onReset,
}: Props) {
  const { theme } = useTheme();
  if (!currentId) {
    return <Placeholder text="No entry node found." theme={theme} />;
  }
  const node = nodeIndex.get(currentId);
  if (!node) {
    return <Placeholder text="Node not found." theme={theme} />;
  }

  const trailSet = new Set(trail);
  const isCondition = node.node_type === NodeType.Condition;
  const nexts = node.next.filter(Boolean);
  const isTerminal = nexts.length === 0;

  return (
    <div className="max-w-[680px] mx-auto px-6 py-10">
      <div className={`rounded-2xl border ${theme.borderColor} ${theme.bgCard} p-6 shadow-sm`}>
        <CardHeader
          theme={theme}
          isLight={isLight}
          nodeType={node.node_type}
          step={trail.length}
        />
        <h2 className={`text-2xl font-semibold ${theme.textPrimary} mb-3 leading-snug`}>
          {(node.title && node.title.trim()) || node.node_id}
        </h2>
        <CardBody node={node} theme={theme} isLight={isLight} />

        <div className="mt-6 space-y-2">
          {isTerminal && (
            <div
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${theme.accentBorder} ${theme.accentBgLight} ${theme.accentColor} font-semibold`}
            >
              <Flag size={16} /> End reached
            </div>
          )}

          {!isTerminal && isCondition && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nexts.map((targetId, idx) => (
                <ConditionAction
                  key={targetId}
                  branch={idx === 0 ? 'TRUE' : 'FALSE'}
                  targetId={targetId}
                  nodeIndex={nodeIndex}
                  trailSet={trailSet}
                  isLight={isLight}
                  theme={theme}
                  onAdvance={onAdvance}
                />
              ))}
            </div>
          )}

          {!isTerminal && !isCondition && nexts.length === 1 && (
            <SinglePathAction
              targetId={nexts[0]}
              nodeIndex={nodeIndex}
              trailSet={trailSet}
              theme={theme}
              onAdvance={onAdvance}
            />
          )}

          {!isTerminal && !isCondition && nexts.length > 1 && (
            <div className="grid grid-cols-1 gap-2">
              {nexts.map((targetId, idx) => (
                <MultiPathAction
                  key={targetId}
                  index={idx + 1}
                  targetId={targetId}
                  nodeIndex={nodeIndex}
                  trailSet={trailSet}
                  theme={theme}
                  onAdvance={onAdvance}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`mt-6 pt-4 border-t ${theme.borderColorLight} flex items-center gap-2`}>
          <button
            onClick={onPrev}
            disabled={trail.length <= 1}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary}`}
            aria-label="Previous step"
          >
            <ArrowLeft size={12} /> Prev
          </button>
          <button
            onClick={onReset}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary}`}
            aria-label="Reset walk"
          >
            <RotateCw size={12} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ text, theme }: { text: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return <div className={`flex-1 flex items-center justify-center ${theme.textMuted}`}>{text}</div>;
}

function CardHeader({
  theme,
  isLight,
  nodeType,
  step,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  isLight: boolean;
  nodeType: NodeType;
  step: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <NodeTypeChip nodeType={nodeType} isLight={isLight} />
      <div className={`text-[10px] font-mono ${theme.textMuted}`}>
        Step {step}
      </div>
    </div>
  );
}

function CardBody({
  node,
  theme,
  isLight,
}: {
  node: WorkflowNode;
  theme: ReturnType<typeof useTheme>['theme'];
  isLight: boolean;
}) {
  const bodyHtml = renderMarkdown(node.description || '');
  if (!bodyHtml) return null;
  const inlineCodeClasses = isLight
    ? '[&_code]:bg-slate-100 [&_code]:text-slate-700'
    : '[&_code]:bg-slate-800 [&_code]:text-slate-200';
  const preBlockClasses = isLight
    ? '[&>pre]:bg-slate-50 [&>pre]:border [&>pre]:border-slate-200 [&>pre]:text-slate-700'
    : '[&>pre]:bg-slate-900 [&>pre]:border [&>pre]:border-slate-800 [&>pre]:text-slate-300';
  const safeMarkup = { __html: bodyHtml };
  return (
    <div
      className={`prose-content text-[15px] leading-7 ${theme.textSecondary}
        [&>p]:mb-3 [&_a]:${theme.accentColor} [&_a]:underline [&_a]:underline-offset-2
        [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded ${inlineCodeClasses} [&_code]:text-[13px] [&_code]:font-mono
        [&>ul]:mb-3 [&>ul]:pl-6 [&>ul]:list-disc [&>ol]:mb-3 [&>ol]:pl-6 [&>ol]:list-decimal
        [&>pre]:mb-3 [&>pre]:rounded-lg [&>pre]:p-3 [&>pre]:overflow-x-auto [&>pre]:text-[13px] [&>pre]:font-mono ${preBlockClasses}`}
      dangerouslySetInnerHTML={safeMarkup}
    />
  );
}

function ConditionAction({
  branch,
  targetId,
  nodeIndex,
  trailSet,
  isLight,
  theme,
  onAdvance,
}: {
  branch: 'TRUE' | 'FALSE';
  targetId: string;
  nodeIndex: Map<string, WorkflowNode>;
  trailSet: Set<string>;
  isLight: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  onAdvance: (targetId: string) => void;
}) {
  const target = nodeIndex.get(targetId);
  const targetTitle = target ? (target.title?.trim() || target.node_id) : targetId;
  const looped = trailSet.has(targetId);
  const branchColor =
    branch === 'TRUE'
      ? isLight ? 'text-emerald-700' : 'text-emerald-300'
      : isLight ? 'text-rose-700' : 'text-rose-300';
  return (
    <ActionButton onClick={() => onAdvance(targetId)} theme={theme} looped={looped}>
      <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${branchColor} block`}>
        {looped ? '↻ Loop back · ' : ''}{branch}
      </span>
      <span className={`text-sm ${theme.textPrimary} font-medium`}>
        → {targetTitle}
      </span>
    </ActionButton>
  );
}

function SinglePathAction({
  targetId,
  nodeIndex,
  trailSet,
  theme,
  onAdvance,
}: {
  targetId: string;
  nodeIndex: Map<string, WorkflowNode>;
  trailSet: Set<string>;
  theme: ReturnType<typeof useTheme>['theme'];
  onAdvance: (targetId: string) => void;
}) {
  const target = nodeIndex.get(targetId);
  const targetTitle = target ? (target.title?.trim() || target.node_id) : targetId;
  const looped = trailSet.has(targetId);
  return (
    <ActionButton onClick={() => onAdvance(targetId)} theme={theme} looped={looped} primary>
      <span className="text-[10px] font-bold uppercase tracking-widest font-mono block">
        {looped ? '↻ Loop back to' : 'Next →'}
      </span>
      <span className="text-sm font-medium">{targetTitle}</span>
    </ActionButton>
  );
}

function MultiPathAction({
  index,
  targetId,
  nodeIndex,
  trailSet,
  theme,
  onAdvance,
}: {
  index: number;
  targetId: string;
  nodeIndex: Map<string, WorkflowNode>;
  trailSet: Set<string>;
  theme: ReturnType<typeof useTheme>['theme'];
  onAdvance: (targetId: string) => void;
}) {
  const target = nodeIndex.get(targetId);
  const targetTitle = target ? (target.title?.trim() || target.node_id) : targetId;
  const looped = trailSet.has(targetId);
  return (
    <ActionButton onClick={() => onAdvance(targetId)} theme={theme} looped={looped}>
      <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${theme.textMuted} block`}>
        {looped ? '↻ Loop back · ' : ''}Path {index}
      </span>
      <span className={`text-sm ${theme.textPrimary} font-medium`}>
        → {targetTitle}
      </span>
    </ActionButton>
  );
}

function ActionButton({
  onClick,
  theme,
  looped,
  primary,
  children,
}: {
  onClick: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  looped?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const base = `block w-full text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer focus:outline-none focus:ring-2 ${theme.accentRing}`;
  const tone = primary
    ? `${theme.accentBg} ${theme.accentBgHover} border-transparent text-white`
    : looped
    ? `${theme.bgSecondary} border-dashed ${theme.borderColor} ${theme.bgCardHover}`
    : `${theme.bgSecondary} ${theme.borderColor} ${theme.bgCardHover}`;
  return (
    <button onClick={onClick} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}
