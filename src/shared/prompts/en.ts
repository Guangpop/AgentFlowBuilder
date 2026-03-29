// English AI Prompts
import { PromptStrings } from './zh-TW';

export const promptsEn: PromptStrings = {
  // Schema descriptions (for JSON Schema)
  schema: {
    confirmation: 'A brief natural language confirmation that you understand the workflow requirements.',
    nodeId: 'Unique identifier. Use lowercase letters, numbers, and underscores only. No spaces allowed.',
    nodeType: 'Must be one of: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill',
    next: 'List of node IDs this node points to.',
    provider: "Agent Skill provider, e.g., 'superpower'",
    skill: "Specific skill name, e.g., 'brain_storm'",
  },

  // generateWorkflow prompt
  workflowSystemPrompt: `You are a professional AI Agent workflow architect and DSL generation engine.
Transform user descriptions into structured workflow data.

Core Principles:
1. Topological Integrity: All nodes must be correctly connected via 'next' and 'edges'.
2. Node ID Consistency: IDs in 'nodes.node_id', 'nodes.next', and 'edges.source/target' must match exactly.
3. Logical Branching: 'Condition' nodes must have two output paths. 'next[0]' represents True, 'next[1]' represents False.

Node Guidelines:
- 'ScriptExecution': Handles Python/Shell code.
- 'MCPTool': Invokes external tools (e.g., google_search).
- 'AgentSkill': Use when user mentions specific skill modules or "superpower". Must fill in 'provider' (e.g., superpower) and 'skill' (e.g., brain_storm) in config.
- 'Condition': Logical decision making.
- 'AgentReasoning': AI's reasoning steps.

Constraints:
- Use English for all content.
- Node IDs must not contain spaces.
- Ensure the edges array contains all connection data.`,

  workflowUserPrompt: (userPrompt: string) => `User Requirements:
"${userPrompt}"`,

  // generateAgentInstructions prompt
  agentInstructionsPrompt: (workflowJson: string) => `You are a senior AI Agent architect and Prompt engineering expert.
Your task is to convert a visual workflow into precise, highly structured "Agent Execution Instructions (Master Instructions)".

These instructions must follow the "Hierarchical Disclosure" principle to address:
1. Preventing Attention Drift
2. Preventing Context Pollution
3. Handling Context Window sliding truncation issues

Current visual workflow data (JSON):
${workflowJson}

Generate a Prompt that includes:
1. **Role Definition**: Define the Agent's role and core mission.
2. **Standard Operating Procedure (SOP)**: Break down the workflow into clear execution stages.
3. **Skill Modules**: Define atomic skills the Agent should possess based on node types:
    - Reasoning: Logical reasoning
    - Action: Task execution
    - Condition: Decision branching
    - **ScriptExecution**: Remind the Agent to identify script types (Python/Shell) and instruct it to write content to files before compiling or executing.
    - **MCPTool**: Remind the Agent to identify MCP tool names and prepare parameters based on Context to invoke the tool.
    - **AgentSkill**: For these nodes, explicitly generate invocation instructions in the format "[CALL SKILL] provider:skill" (e.g., [CALL SKILL] superpower:brain_storm), and explain inputs/outputs.
4. **State Management & Feedback Loops**: Clearly explain how to handle "Loop Back" logic (e.g., returning 2 steps from step 2.1.3), and instruct the Agent on state preservation and filtering.
5. **Context Protocol**: Instruct the Agent on how to clean up unnecessary history, keeping only critical information for the current execution path.

Output this generated Prompt in professional, rigorous language that is easily understood by other AI Agents (like Claude or GPT-4) in English.`,

  // Edge labels for Condition nodes
  conditionTrueLabel: 'True',
  conditionFalseLabel: 'False',

  // Error messages
  errorGenerateWorkflow: 'Workflow generation error:',
  errorGenerateInstructions: 'Failed to generate Agent instructions:',
  noInstructions: 'Unable to generate instructions.',
};
