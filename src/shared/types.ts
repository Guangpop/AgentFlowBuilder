export enum NodeType {
  UserInput = 'UserInput',
  AgentReasoning = 'AgentReasoning',
  Condition = 'Condition',
  AgentQuestion = 'AgentQuestion',
  UserResponse = 'UserResponse',
  AgentAction = 'AgentAction',
  ScriptExecution = 'ScriptExecution',
  MCPTool = 'MCPTool',
  AgentSkill = 'AgentSkill'
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  node_id: string;
  node_type: NodeType;
  title?: string; // Short human label shown in canvas / Mermaid; lives in MD frontmatter
  description: string; // Long-form prose body; lives in MD `## Title {#id}` section body
  inputs: string[];
  outputs: string[];
  config?: Record<string, any>;
  position: NodePosition;
  next: string[]; // Positional at runtime. Condition: [trueTarget, falseTarget]. Serialized as map in MD.
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourcePortIndex: number;
  targetPortIndex: number;
  label?: string;
  isLoop?: boolean;
}

export interface Workflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: Edge[];
}

export interface WorkflowResponse {
  confirmation: string;
  workflow: Workflow;
}