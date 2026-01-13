import React from 'react';
import { 
  User, 
  Brain, 
  GitBranch, 
  HelpCircle, 
  MessageSquare, 
  Play,
  Terminal,
  Wrench
} from 'lucide-react';
import { NodeType } from './types';

export const NODE_DISPLAY_NAMES: Record<NodeType, string> = {
  [NodeType.UserInput]: '用戶輸入',
  [NodeType.AgentReasoning]: 'AI 邏輯推理',
  [NodeType.Condition]: '條件分支判斷',
  [NodeType.AgentQuestion]: 'AI 澄清提問',
  [NodeType.UserResponse]: '用戶補充回答',
  [NodeType.AgentAction]: '執行任務動作',
  [NodeType.ScriptExecution]: '執行腳本代碼',
  [NodeType.MCPTool]: '調用 MCP 工具',
};

export const NODE_COLORS: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.UserInput]: { bg: 'bg-blue-900/40', border: 'border-blue-500', icon: 'text-blue-400' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-900/40', border: 'border-purple-500', icon: 'text-purple-400' },
  [NodeType.Condition]: { bg: 'bg-orange-900/40', border: 'border-orange-500', icon: 'text-orange-400' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-900/40', border: 'border-cyan-500', icon: 'text-cyan-400' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-900/40', border: 'border-indigo-500', icon: 'text-indigo-400' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-900/40', border: 'border-emerald-500', icon: 'text-emerald-400' },
  [NodeType.ScriptExecution]: { bg: 'bg-slate-800/80', border: 'border-slate-400', icon: 'text-slate-300' },
  [NodeType.MCPTool]: { bg: 'bg-pink-900/40', border: 'border-pink-500', icon: 'text-pink-400' },
};

export const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  [NodeType.UserInput]: <User size={20} />,
  [NodeType.AgentReasoning]: <Brain size={20} />,
  [NodeType.Condition]: <GitBranch size={20} />,
  [NodeType.AgentQuestion]: <HelpCircle size={20} />,
  [NodeType.UserResponse]: <MessageSquare size={20} />,
  [NodeType.AgentAction]: <Play size={20} />,
  [NodeType.ScriptExecution]: <Terminal size={20} />,
  [NodeType.MCPTool]: <Wrench size={20} />,
};