import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NodeType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { NodeTypeChip } from './NodeTypeChip';

export interface BranchTarget {
  id: string;
  title: string;
  nodeType: NodeType;
}

interface BranchCardProps {
  kind: 'true' | 'false';
  target?: BranchTarget;
  sourceId: string;
  theme: ReturnType<typeof useTheme>['theme'];
  isLight: boolean;
  onClick: (source: string, target: string) => void;
}

export function BranchCard({ kind, target, sourceId, theme, isLight, onClick }: BranchCardProps) {
  if (!target) {
    return (
      <div className={`p-4 rounded-lg border border-dashed ${theme.borderColor} ${theme.textMuted} text-xs italic`}>
        {kind === 'true' ? 'TRUE' : 'FALSE'} branch is not connected
      </div>
    );
  }
  const labelColor =
    kind === 'true'
      ? isLight ? 'text-emerald-700' : 'text-emerald-300'
      : isLight ? 'text-rose-700' : 'text-rose-300';
  return (
    <button
      onClick={() => onClick(sourceId, target.id)}
      className={`group text-left w-full p-4 rounded-lg border ${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover} transition-colors cursor-pointer focus:outline-none focus:ring-2 ${theme.accentRing}`}
      aria-label={`${kind.toUpperCase()} branch — jump to ${target.title}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-bold uppercase tracking-widest font-mono ${labelColor}`}>
          {kind === 'true' ? 'TRUE' : 'FALSE'}
        </span>
        <ChevronRight size={12} className={`${theme.textMuted} group-hover:${theme.accentColor} transition-colors`} />
      </div>
      <NodeTypeChip nodeType={target.nodeType} isLight={isLight} />
      <div className={`mt-2 text-sm font-medium ${theme.textPrimary}`}>{target.title}</div>
    </button>
  );
}
