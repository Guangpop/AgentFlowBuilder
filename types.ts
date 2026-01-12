export enum NodeType {
  UserInput = 'UserInput',
  AgentReasoning = 'AgentReasoning',
  Condition = 'Condition',
  AgentQuestion = 'AgentQuestion',
  UserResponse = 'UserResponse',
  AgentAction = 'AgentAction'
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  node_id: string;
  node_type: NodeType;
  description: string;
  inputs: string[];
  outputs: string[];
  config?: Record<string, any>;
  position: NodePosition;
  next: string[]; // This stores targets, maintained for AI logic
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