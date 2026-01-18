import { Workflow, WorkflowResponse } from '../../types';
import { Language } from '../../locales';

export type AIProviderType = 'gemini' | 'claude';

export interface AIProvider {
  id: AIProviderType;
  name: string;
  modelName: string;
  generateWorkflow(prompt: string, language: Language): Promise<WorkflowResponse>;
  generateAgentInstructions(workflow: Workflow, language: Language): Promise<string>;
  checkApiKey(): boolean;
}

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  modelName: string;
  envKey: string;
}

export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini 3 Flash',
    modelName: 'GEMINI-3-FLASH',
    envKey: 'GEMINI_API_KEY',
  },
  claude: {
    id: 'claude',
    name: 'Claude Sonnet 4.5',
    modelName: 'CLAUDE-SONNET-4.5',
    envKey: 'ANTHROPIC_API_KEY',
  },
};
