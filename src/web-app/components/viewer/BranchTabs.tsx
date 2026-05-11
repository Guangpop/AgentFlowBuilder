import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { NodeTypeChip } from './NodeTypeChip';
import { BranchPreviewStep } from './viewerUtils';

interface BranchData {
  kind: 'true' | 'false';
  /** Up to 5 nodes starting from the branch's target. */
  preview: BranchPreviewStep[];
}

interface Props {
  sourceId: string;
  branches: BranchData[];
  isLight: boolean;
  onJump: (source: string, target: string) => void;
}

export function BranchTabs({ sourceId, branches, isLight, onJump }: Props) {
  const { theme } = useTheme();
  const [activeKind, setActiveKind] = useState<'true' | 'false'>('true');
  const active = branches.find((b) => b.kind === activeKind) ?? branches[0];

  // Theme-aware colors for TRUE/FALSE.
  const trueColor = isLight ? 'text-emerald-700' : 'text-emerald-300';
  const falseColor = isLight ? 'text-rose-700' : 'text-rose-300';

  const labelColor = (kind: 'true' | 'false') => (kind === 'true' ? trueColor : falseColor);

  return (
    <div className="mt-6">
      <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} mb-2`}>
        Branches
      </div>

      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="Branch preview"
        className={`inline-flex p-0.5 rounded-lg border ${theme.borderColor} ${theme.bgSecondary}`}
      >
        {branches.map((b) => {
          const isActive = b.kind === activeKind;
          return (
            <button
              key={b.kind}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKind(b.kind)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-mono rounded-md transition-colors cursor-pointer
                ${isActive
                  ? `${theme.bgCard} ${labelColor(b.kind)} shadow-sm`
                  : `bg-transparent ${theme.textMuted} hover:${theme.textSecondary}`}`}
            >
              {b.kind === 'true' ? 'TRUE' : 'FALSE'} branch
            </button>
          );
        })}
      </div>

      {/* Preview list */}
      <div className={`mt-3 rounded-lg border ${theme.borderColor} ${theme.bgCard} p-3 space-y-1`}>
        {active.preview.length === 0 ? (
          <div className={`text-xs italic ${theme.textMuted} px-2 py-1`}>
            {activeKind.toUpperCase()} branch is not connected
          </div>
        ) : (
          active.preview.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => onJump(sourceId, step.id)}
              className={`group w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md ${theme.bgCardHover} transition-colors cursor-pointer focus:outline-none focus:ring-2 ${theme.accentRing}`}
              aria-label={`Jump to ${step.title}`}
            >
              <span className={`text-[10px] font-mono w-4 text-right ${theme.textMuted}`}>{idx + 1}</span>
              <NodeTypeChip nodeType={step.nodeType} isLight={isLight} />
              <span className={`text-sm ${theme.textPrimary} truncate flex-1`}>{step.title}</span>
              <ChevronRight
                size={12}
                className={`${theme.textMuted} group-hover:${theme.accentColor} transition-colors shrink-0`}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
