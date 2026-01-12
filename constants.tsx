
import React from 'react';
import { 
  User, 
  Brain, 
  GitBranch, 
  HelpCircle, 
  MessageSquare, 
  Play, 
  RotateCcw, 
  Layers 
} from 'lucide-react';
import { NodeType } from './types';

export const NODE_COLORS: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.UserInput]: { bg: 'bg-blue-900/40', border: 'border-blue-500', icon: 'text-blue-400' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-900/40', border: 'border-purple-500', icon: 'text-purple-400' },
  [NodeType.Condition]: { bg: 'bg-orange-900/40', border: 'border-orange-500', icon: 'text-orange-400' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-900/40', border: 'border-cyan-500', icon: 'text-cyan-400' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-900/40', border: 'border-indigo-500', icon: 'text-indigo-400' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-900/40', border: 'border-emerald-500', icon: 'text-emerald-400' },
  [NodeType.LoopBack]: { bg: 'bg-rose-900/40', border: 'border-rose-500', icon: 'text-rose-400' },
  [NodeType.SubWorkflow]: { bg: 'bg-slate-800/60', border: 'border-slate-500', icon: 'text-slate-300' },
};

export const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  [NodeType.UserInput]: <User size={18} />,
  [NodeType.AgentReasoning]: <Brain size={18} />,
  [NodeType.Condition]: <GitBranch size={18} />,
  [NodeType.AgentQuestion]: <HelpCircle size={18} />,
  [NodeType.UserResponse]: <MessageSquare size={18} />,
  [NodeType.AgentAction]: <Play size={18} />,
  [NodeType.LoopBack]: <RotateCcw size={18} />,
  [NodeType.SubWorkflow]: <Layers size={18} />,
};
