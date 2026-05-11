import React from 'react';
import { CornerUpLeft } from 'lucide-react';
import { Workflow, WorkflowNode, NodeType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { NodeTypeChip } from './NodeTypeChip';
import { ViewerSectionData, renderMarkdown, bfsBranchPreview } from './viewerUtils';
import { BranchTabs } from './BranchTabs';

interface Props {
  workflow: Workflow;
  nodeIndex: Map<string, WorkflowNode>;
  sections: ViewerSectionData[];
  highlightId: string | null;
  activeBack: { source: string; target: string } | null;
  jumpBack: () => void;
  jumpFromCondition: (source: string, target: string) => void;
  registerSectionRef: (id: string, el: HTMLElement | null) => void;
}

// Content rendered via marked then sanitized with DOMPurify in renderMarkdown.
export function ReadModeContent({
  workflow,
  nodeIndex,
  sections,
  highlightId,
  activeBack,
  jumpBack,
  jumpFromCondition,
  registerSectionRef,
}: Props) {
  const { theme, themeId } = useTheme();
  const isLight = themeId === 'warm' || themeId === 'minimal';

  const inlineCodeClasses = isLight
    ? '[&_code]:bg-slate-100 [&_code]:text-slate-700'
    : '[&_code]:bg-slate-800 [&_code]:text-slate-200';
  const preBlockClasses = isLight
    ? '[&>pre]:bg-slate-50 [&>pre]:border [&>pre]:border-slate-200 [&>pre]:text-slate-700'
    : '[&>pre]:bg-slate-900 [&>pre]:border [&>pre]:border-slate-800 [&>pre]:text-slate-300';
  const linkClasses = `[&_a]:${theme.accentColor} [&_a:hover]:opacity-80 [&_a]:underline [&_a]:underline-offset-2`;
  const blockquoteClasses = isLight
    ? '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500'
    : '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400';
  const detailsBg = isLight ? 'bg-slate-50/80' : 'bg-slate-900/60';
  const detailsCodeText = isLight ? 'text-slate-700' : 'text-slate-300';
  const detailsPreText = isLight ? 'text-slate-700' : 'text-slate-300';

  const headerHtml = workflow.description ? renderMarkdown(workflow.description) : '';

  return (
    <article className="max-w-[720px] mx-auto px-6 py-10 text-[15px] leading-7">
      <h1 className={`text-3xl font-semibold ${theme.textPrimary} tracking-tight mb-4`}>
        {workflow.name}
      </h1>
      {workflow.description && (
        <div
          className={`${theme.textMuted} text-base leading-7 mb-10
            ${linkClasses}
            [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded ${inlineCodeClasses} [&_code]:text-[13px] [&_code]:font-mono`}
          dangerouslySetInnerHTML={{ __html: headerHtml }}
        />
      )}

      {sections.map((s) => {
        const node = nodeIndex.get(s.id);
        const showBackPill = activeBack?.target === s.id && activeBack.source;
        const backSourceTitle = showBackPill
          ? (nodeIndex.get(activeBack.source)?.title?.trim() || activeBack.source)
          : null;

        let branchTabsData: { kind: 'true' | 'false'; preview: ReturnType<typeof bfsBranchPreview> }[] | null = null;
        if (node?.node_type === NodeType.Condition) {
          branchTabsData = [
            { kind: 'true', preview: bfsBranchPreview(node.next[0], nodeIndex) },
            { kind: 'false', preview: bfsBranchPreview(node.next[1], nodeIndex) },
          ];
        }

        return (
          <section
            key={s.id}
            id={s.id}
            ref={(el) => registerSectionRef(s.id, el)}
            className={`mb-10 scroll-mt-20 rounded-lg motion-safe:transition-shadow motion-safe:duration-1000 ${
              highlightId === s.id ? `ring-2 ${theme.accentRing} ring-offset-2` : ''
            }`}
          >
            {showBackPill && backSourceTitle && (
              <div className="mb-3">
                <button
                  onClick={jumpBack}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${theme.bgCard} border ${theme.borderColor} ${theme.textSecondary} hover:${theme.textPrimary} ${theme.bgCardHover} transition-colors cursor-pointer focus:outline-none focus:ring-2 ${theme.accentRing}`}
                  aria-label={`Back to ${backSourceTitle}`}
                >
                  <CornerUpLeft size={12} />
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${theme.textMuted}`}>back to</span>
                  <span className="font-medium">{backSourceTitle}</span>
                </button>
              </div>
            )}
            <NodeTypeChip nodeType={s.nodeType} isLight={isLight} />
            <h2 className={`text-xl font-semibold ${theme.textPrimary} mt-2 mb-3 pl-3 border-l-2 ${theme.accentBorder}`}>
              {s.title}
            </h2>
            <div
              className={`prose-content
                [&>p]:mb-4 [&>p]:leading-7
                [&>ul]:mb-4 [&>ul]:pl-6 [&>ul]:space-y-1 [&>ul]:list-disc
                [&>ol]:mb-4 [&>ol]:pl-6 [&>ol]:space-y-1 [&>ol]:list-decimal
                ${linkClasses}
                [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded ${inlineCodeClasses} [&_code]:text-[13px] [&_code]:font-mono
                [&>pre]:mb-4 [&>pre]:rounded-lg [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:text-[13px] [&>pre]:font-mono ${preBlockClasses}
                ${blockquoteClasses}`}
              dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
            />

            {branchTabsData && (
              <BranchTabs
                sourceId={s.id}
                branches={branchTabsData}
                isLight={isLight}
                onJump={jumpFromCondition}
              />
            )}

            {s.configBlocks.map((cb) => (
              <details
                key={cb.key}
                className={`mt-4 rounded-lg border ${theme.borderColor} ${detailsBg} group`}
              >
                <summary className={`cursor-pointer px-4 py-2 text-xs font-mono ${theme.textMuted} hover:${theme.textSecondary} select-none flex items-center gap-2`}>
                  <span className={`text-[9px] uppercase tracking-widest ${theme.textMuted}`}>config</span>
                  <code className={detailsCodeText}>{cb.key}</code>
                  <span className={`${theme.textMuted} ml-auto text-[10px] group-open:hidden`}>show</span>
                  <span className={`${theme.textMuted} ml-auto text-[10px] hidden group-open:inline`}>hide</span>
                </summary>
                <pre className={`px-4 pb-4 pt-2 text-[13px] font-mono ${detailsPreText} overflow-x-auto whitespace-pre`}>
                  <code className={`language-${cb.lang}`}>{cb.code}</code>
                </pre>
              </details>
            ))}
          </section>
        );
      })}
    </article>
  );
}
