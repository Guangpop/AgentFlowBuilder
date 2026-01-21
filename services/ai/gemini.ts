import { GoogleGenAI, Type } from "@google/genai";
import { Workflow, WorkflowResponse } from "../../types";
import { Language } from "../../locales";
import { getPrompts } from "../../prompts";
import { AIProvider, AI_PROVIDERS } from "./types";
import { postProcessWorkflow } from "./postProcess";

// Lazy initialization
let ai: GoogleGenAI | null = null;

const getApiKey = (): string | undefined => {
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY;
  const processKey = typeof process !== 'undefined' ? (process.env?.GEMINI_API_KEY || process.env?.API_KEY) : undefined;
  return viteKey || processKey;
};

const getAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const WORKFLOW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    confirmation: {
      type: Type.STRING,
      description: "Brief natural language confirmation of understanding the workflow requirements.",
    },
    workflow: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              node_id: { type: Type.STRING, description: "Unique identifier, use lowercase letters, numbers and underscores only." },
              node_type: {
                type: Type.STRING,
                description: "Must be one of: UserInput, AgentReasoning, Condition, AgentQuestion, UserResponse, AgentAction, ScriptExecution, MCPTool, AgentSkill"
              },
              description: { type: Type.STRING },
              inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
              next: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of next node IDs this node points to." },
              config: {
                type: Type.OBJECT,
                properties: {
                  scriptType: { type: Type.STRING },
                  scriptContent: { type: Type.STRING },
                  toolName: { type: Type.STRING },
                  provider: { type: Type.STRING, description: "Agent Skill provider, e.g. 'superpower'" },
                  skill: { type: Type.STRING, description: "Specific skill name, e.g. 'brain_storm'" }
                }
              }
            },
            required: ["node_id", "node_type", "description", "inputs", "outputs", "next"]
          }
        },
        edges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              label: { type: Type.STRING },
              isLoop: { type: Type.BOOLEAN }
            }
          }
        }
      },
      required: ["name", "description", "nodes", "edges"]
    }
  },
  required: ["confirmation", "workflow"]
};

export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: AI_PROVIDERS.gemini.name,
  modelName: AI_PROVIDERS.gemini.modelName,

  checkApiKey(): boolean {
    return !!getApiKey();
  },

  async generateWorkflow(prompt: string, language: Language = 'zh-TW', _prime?: string): Promise<WorkflowResponse> {
    const p = getPrompts(language);

    try {
      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${p.workflowSystemPrompt}\n\n${p.workflowUserPrompt(prompt)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: WORKFLOW_SCHEMA,
        },
      });

      const data = JSON.parse(response.text || '{}') as WorkflowResponse;
      return postProcessWorkflow(data, language);
    } catch (error) {
      console.error(p.errorGenerateWorkflow, error);
      throw error;
    }
  },

  async generateAgentInstructions(workflow: Workflow, language: Language = 'zh-TW', _prime?: string): Promise<string> {
    const p = getPrompts(language);

    try {
      const response = await getAI().models.generateContent({
        model: "gemini-3-pro-preview",
        contents: p.agentInstructionsPrompt(JSON.stringify(workflow, null, 2)),
        config: {
          temperature: 1,
          thinkingConfig: { thinkingBudget: 32768 }
        },
      });

      return response.text || p.noInstructions;
    } catch (error) {
      console.error(p.errorGenerateInstructions, error);
      throw error;
    }
  }
};
