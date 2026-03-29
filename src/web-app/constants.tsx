import React from 'react';
import { 
  User, 
  Brain, 
  GitBranch, 
  HelpCircle, 
  MessageSquare, 
  Play,
  Terminal,
  Wrench,
  Cpu
} from 'lucide-react';
import { NodeType } from './types';

// Dark theme node colors
export const NODE_COLORS_DARK: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.UserInput]: { bg: 'bg-blue-900/40', border: 'border-blue-500', icon: 'text-blue-400' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-900/40', border: 'border-purple-500', icon: 'text-purple-400' },
  [NodeType.Condition]: { bg: 'bg-orange-900/40', border: 'border-orange-500', icon: 'text-orange-400' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-900/40', border: 'border-cyan-500', icon: 'text-cyan-400' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-900/40', border: 'border-indigo-500', icon: 'text-indigo-400' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-900/40', border: 'border-emerald-500', icon: 'text-emerald-400' },
  [NodeType.ScriptExecution]: { bg: 'bg-slate-800/80', border: 'border-slate-400', icon: 'text-slate-300' },
  [NodeType.MCPTool]: { bg: 'bg-pink-900/40', border: 'border-pink-500', icon: 'text-pink-400' },
  [NodeType.AgentSkill]: { bg: 'bg-amber-900/40', border: 'border-amber-500', icon: 'text-amber-400' },
};

// Warm/light theme node colors — softer, comfortable tones
export const NODE_COLORS_LIGHT: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.UserInput]: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-600' },
  [NodeType.AgentReasoning]: { bg: 'bg-purple-50', border: 'border-purple-300', icon: 'text-purple-600' },
  [NodeType.Condition]: { bg: 'bg-amber-50', border: 'border-amber-300', icon: 'text-amber-600' },
  [NodeType.AgentQuestion]: { bg: 'bg-cyan-50', border: 'border-cyan-300', icon: 'text-cyan-600' },
  [NodeType.UserResponse]: { bg: 'bg-indigo-50', border: 'border-indigo-300', icon: 'text-indigo-600' },
  [NodeType.AgentAction]: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: 'text-emerald-600' },
  [NodeType.ScriptExecution]: { bg: 'bg-stone-100', border: 'border-stone-300', icon: 'text-stone-600' },
  [NodeType.MCPTool]: { bg: 'bg-pink-50', border: 'border-pink-300', icon: 'text-pink-600' },
  [NodeType.AgentSkill]: { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-600' },
};

// Default export for backward compat — components should use getNodeColors(themeId) instead
export const NODE_COLORS = NODE_COLORS_DARK;

export function getNodeColors(themeId: string): Record<NodeType, { bg: string; border: string; icon: string }> {
  return (themeId === 'warm' || themeId === 'minimal') ? NODE_COLORS_LIGHT : NODE_COLORS_DARK;
}

export const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  [NodeType.UserInput]: <User size={22} />,
  [NodeType.AgentReasoning]: <Brain size={22} />,
  [NodeType.Condition]: <GitBranch size={22} />,
  [NodeType.AgentQuestion]: <HelpCircle size={22} />,
  [NodeType.UserResponse]: <MessageSquare size={22} />,
  [NodeType.AgentAction]: <Play size={22} />,
  [NodeType.ScriptExecution]: <Terminal size={22} />,
  [NodeType.MCPTool]: <Wrench size={22} />,
  [NodeType.AgentSkill]: <Cpu size={22} />,
};

// Toolbar categories — group node types for better discoverability
export const NODE_CATEGORIES: { labelKey: string; types: NodeType[] }[] = [
  { labelKey: 'categoryUser', types: [NodeType.UserInput, NodeType.UserResponse] },
  { labelKey: 'categoryAgent', types: [NodeType.AgentReasoning, NodeType.AgentQuestion, NodeType.AgentAction] },
  { labelKey: 'categorySystem', types: [NodeType.Condition, NodeType.ScriptExecution, NodeType.MCPTool, NodeType.AgentSkill] },
];