
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

export const NODE_DISPLAY_NAMES: Record<NodeType, string> = {
  [NodeType.UserInput]: '用戶輸入',
  [NodeType.AgentReasoning]: 'AI 邏輯推理',
  [NodeType.Condition]: '條件分支判斷',
  [NodeType.AgentQuestion]: 'AI 澄清提問',
  [NodeType.UserResponse]: '用戶補充回答',
  [NodeType.AgentAction]: '執行任務動作',
  [NodeType.LoopBack]: '流程返回/回圈',
  [NodeType.SubWorkflow]: '子流程模組',
};

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
  [NodeType.UserInput]: <User size={20} />,
  [NodeType.AgentReasoning]: <Brain size={20} />,
  [NodeType.Condition]: <GitBranch size={20} />,
  [NodeType.AgentQuestion]: <HelpCircle size={20} />,
  [NodeType.UserResponse]: <MessageSquare size={20} />,
  [NodeType.AgentAction]: <Play size={20} />,
  [NodeType.LoopBack]: <RotateCcw size={20} />,
  [NodeType.SubWorkflow]: <Layers size={20} />,
};
