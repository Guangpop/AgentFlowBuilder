import { NodeType } from './types.js';

export interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description: string;
  color: string;
  requiredConfig?: string[];
}

export const NODE_TYPE_INFO: Record<NodeType, NodeTypeInfo> = {
  [NodeType.UserInput]: {
    type: NodeType.UserInput,
    label: 'User Input',
    description: 'Entry point where user provides input',
    color: 'blue',
  },
  [NodeType.AgentReasoning]: {
    type: NodeType.AgentReasoning,
    label: 'Agent Reasoning',
    description: 'AI reasoning and analysis step',
    color: 'purple',
  },
  [NodeType.Condition]: {
    type: NodeType.Condition,
    label: 'Condition',
    description: 'Decision/branching logic with True/False paths',
    color: 'orange',
  },
  [NodeType.AgentQuestion]: {
    type: NodeType.AgentQuestion,
    label: 'Agent Question',
    description: 'Agent asks user a question',
    color: 'cyan',
  },
  [NodeType.UserResponse]: {
    type: NodeType.UserResponse,
    label: 'User Response',
    description: 'User provides a response to agent question',
    color: 'indigo',
  },
  [NodeType.AgentAction]: {
    type: NodeType.AgentAction,
    label: 'Agent Action',
    description: 'Agent executes an action',
    color: 'emerald',
  },
  [NodeType.ScriptExecution]: {
    type: NodeType.ScriptExecution,
    label: 'Script Execution',
    description: 'Execute Python or Shell scripts',
    color: 'slate',
    requiredConfig: ['scriptType', 'scriptContent'],
  },
  [NodeType.MCPTool]: {
    type: NodeType.MCPTool,
    label: 'MCP Tool',
    description: 'Invoke external MCP tools (e.g., google_search)',
    color: 'pink',
    requiredConfig: ['toolName'],
  },
  [NodeType.AgentSkill]: {
    type: NodeType.AgentSkill,
    label: 'Agent Skill',
    description: 'Call external skill modules (e.g., superpower:brain_storm)',
    color: 'amber',
    requiredConfig: ['provider', 'skill'],
  },
};
