import Anthropic from "@anthropic-ai/sdk";
import { Workflow, WorkflowResponse } from "../../types";
import { Language } from "../../locales";
import { getPrompts } from "../../prompts";
import { AIProvider, AI_PROVIDERS } from "./types";
import { postProcessWorkflow } from "./postProcess";

// Lazy initialization
let client: Anthropic | null = null;

const getApiKey = (): string | undefined => {
  const viteKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  const processKey = typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined;
  return viteKey || processKey;
};

const getClient = (): Anthropic => {
  if (!client) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found');
    }
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
};

// Tool definition for structured workflow output
const WORKFLOW_TOOL: Anthropic.Tool = {
  name: "generate_workflow",
  description: "Generate a workflow structure based on the user's requirements",
  input_schema: {
    type: "object" as const,
    properties: {
      confirmation: {
        type: "string",
        description: "Brief natural language confirmation of understanding the workflow requirements."
      },
      workflow: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                node_id: { type: "string", description: "Unique identifier, use lowercase letters, numbers and underscores only." },
                node_type: {
                  type: "string",
                  enum: ["UserInput", "AgentReasoning", "Condition", "AgentQuestion", "UserResponse", "AgentAction", "ScriptExecution", "MCPTool", "AgentSkill"],
                  description: "Type of the node"
                },
                description: { type: "string" },
                inputs: { type: "array", items: { type: "string" } },
                outputs: { type: "array", items: { type: "string" } },
                next: { type: "array", items: { type: "string" }, description: "List of next node IDs this node points to." },
                config: {
                  type: "object",
                  properties: {
                    scriptType: { type: "string" },
                    scriptContent: { type: "string" },
                    toolName: { type: "string" },
                    provider: { type: "string" },
                    skill: { type: "string" }
                  }
                }
              },
              required: ["node_id", "node_type", "description", "inputs", "outputs", "next"]
            }
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                source: { type: "string" },
                target: { type: "string" },
                label: { type: "string" },
                isLoop: { type: "boolean" }
              }
            }
          }
        },
        required: ["name", "description", "nodes", "edges"]
      }
    },
    required: ["confirmation", "workflow"]
  }
};

export const claudeProvider: AIProvider = {
  id: 'claude',
  name: AI_PROVIDERS.claude.name,
  modelName: AI_PROVIDERS.claude.modelName,

  checkApiKey(): boolean {
    return !!getApiKey();
  },

  async generateWorkflow(prompt: string, language: Language = 'zh-TW'): Promise<WorkflowResponse> {
    const p = getPrompts(language);

    try {
      const response = await getClient().messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        tools: [WORKFLOW_TOOL],
        tool_choice: { type: "tool", name: "generate_workflow" },
        messages: [
          {
            role: "user",
            content: `${p.workflowSystemPrompt}\n\n${p.workflowUserPrompt(prompt)}`
          }
        ]
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use response from Claude');
      }

      const data = toolUse.input as WorkflowResponse;
      return postProcessWorkflow(data, language);
    } catch (error: any) {
      console.error('[Claude] generateWorkflow error:', error);
      console.error('[Claude] Error message:', error?.message);
      console.error('[Claude] Error status:', error?.status);
      throw error;
    }
  },

  async generateAgentInstructions(workflow: Workflow, language: Language = 'zh-TW'): Promise<string> {
    const p = getPrompts(language);

    try {
      const response = await getClient().messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        messages: [
          {
            role: "user",
            content: p.agentInstructionsPrompt(JSON.stringify(workflow, null, 2))
          }
        ]
      });

      const textBlock = response.content.find(block => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return p.noInstructions;
      }

      return textBlock.text;
    } catch (error) {
      console.error(p.errorGenerateInstructions, error);
      throw error;
    }
  }
};
