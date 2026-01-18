import Anthropic from "@anthropic-ai/sdk";
import { Workflow, WorkflowResponse } from "../../types";
import { Language, getLocale } from "../../locales";
import { getPrompts } from "../../prompts";
import { AIProvider, AI_PROVIDERS } from "./types";
import { postProcessWorkflow } from "./postProcess";
import { supabase } from "../../lib/supabase";

// Determine mode based on environment variable
const isLocalMode = !!import.meta.env.VITE_LOCAL_API_KEY;

// ============================================================
// Local Mode: Direct Claude API calls (developer's own key)
// ============================================================

let localClient: Anthropic | null = null;

const getLocalClient = (): Anthropic => {
  if (!localClient) {
    const apiKey = import.meta.env.VITE_LOCAL_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_LOCAL_API_KEY not found');
    }
    localClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return localClient;
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

const localGenerateWorkflow = async (prompt: string, language: Language): Promise<WorkflowResponse> => {
  const p = getPrompts(language);

  const response = await getLocalClient().messages.create({
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

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool use response from Claude');
  }

  return postProcessWorkflow(toolUse.input as WorkflowResponse, language);
};

const localGenerateInstructions = async (workflow: Workflow, language: Language): Promise<string> => {
  const p = getPrompts(language);

  const response = await getLocalClient().messages.create({
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
};

// ============================================================
// Production Mode: Backend API calls (with auth & billing)
// ============================================================

const getAuthToken = async (language: Language): Promise<string> => {
  const t = getLocale(language);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error(t.alertNotAuthenticated);
  }
  return session.access_token;
};

const prodGenerateWorkflow = async (prompt: string, language: Language): Promise<WorkflowResponse> => {
  const t = getLocale(language);
  const token = await getAuthToken(language);

  const response = await fetch('/api/generate-workflow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 402) {
      throw new Error(t.alertInsufficientBalance(error.required, error.balance));
    }
    throw new Error(error.error || t.alertGenerateFailed);
  }

  const { result } = await response.json();
  return postProcessWorkflow(result, language);
};

const prodGenerateInstructions = async (workflow: Workflow, language: Language): Promise<string> => {
  const t = getLocale(language);
  const token = await getAuthToken(language);

  const response = await fetch('/api/generate-sop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ workflow, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 402) {
      throw new Error(t.alertInsufficientBalance(error.required, error.balance));
    }
    throw new Error(error.error || t.alertInstructionsFailed);
  }

  const { result } = await response.json();
  return result;
};

// ============================================================
// Unified Provider Interface
// ============================================================

export const claudeProvider: AIProvider = {
  id: 'claude',
  name: AI_PROVIDERS.claude.name,
  modelName: AI_PROVIDERS.claude.modelName,

  checkApiKey(): boolean {
    // Local mode: check if VITE_LOCAL_API_KEY exists
    // Production mode: always true (backend handles it)
    return isLocalMode ? !!import.meta.env.VITE_LOCAL_API_KEY : true;
  },

  async generateWorkflow(prompt: string, language: Language = 'zh-TW'): Promise<WorkflowResponse> {
    if (isLocalMode) {
      return localGenerateWorkflow(prompt, language);
    } else {
      return prodGenerateWorkflow(prompt, language);
    }
  },

  async generateAgentInstructions(workflow: Workflow, language: Language = 'zh-TW'): Promise<string> {
    if (isLocalMode) {
      return localGenerateInstructions(workflow, language);
    } else {
      return prodGenerateInstructions(workflow, language);
    }
  }
};
