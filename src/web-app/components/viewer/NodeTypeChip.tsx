import React from 'react';
import { NodeType } from '../../types';

interface ChipPalette {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const CHIP_PALETTE_DARK: Record<NodeType, ChipPalette> = {
  [NodeType.UserInput]: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  [NodeType.Condition]: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  [NodeType.ScriptExecution]: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-400' },
  [NodeType.MCPTool]: { bg: 'bg-pink-500/10', text: 'text-pink-300', border: 'border-pink-500/30', dot: 'bg-pink-400' },
  [NodeType.AgentSkill]: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
};

const CHIP_PALETTE_LIGHT: Record<NodeType, ChipPalette> = {
  [NodeType.UserInput]: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  [NodeType.Condition]: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  [NodeType.ScriptExecution]: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  [NodeType.MCPTool]: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  [NodeType.AgentSkill]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
};

export function chipPalette(nodeType: NodeType, isLight: boolean): ChipPalette {
  return (isLight ? CHIP_PALETTE_LIGHT : CHIP_PALETTE_DARK)[nodeType];
}

export function NodeTypeChip({ nodeType, isLight }: { nodeType: NodeType; isLight: boolean }) {
  const p = chipPalette(nodeType, isLight);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest font-mono px-2 py-0.5 rounded-full border ${p.bg} ${p.text} ${p.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {nodeType}
    </span>
  );
}
