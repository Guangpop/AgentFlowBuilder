import { Workflow, WorkflowResponse } from "../../types";
import { Language } from "../../locales";
import { AIProvider, AI_PROVIDERS } from "./types";
import { postProcessWorkflow } from "./postProcess";
import { supabase } from "../../lib/supabase";

// Get auth token for API calls
const getAuthToken = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
};

export const claudeProvider: AIProvider = {
  id: 'claude',
  name: AI_PROVIDERS.claude.name,
  modelName: AI_PROVIDERS.claude.modelName,

  checkApiKey(): boolean {
    // Always return true since we use backend API
    return true;
  },

  async generateWorkflow(prompt: string, language: Language = 'zh-TW'): Promise<WorkflowResponse> {
    const token = await getAuthToken();

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
        throw new Error(`餘額不足。需要 $${error.required}，目前餘額 $${error.balance}`);
      }
      throw new Error(error.error || 'Failed to generate workflow');
    }

    const { result } = await response.json();

    // Backend returns structured data from tool use directly
    return postProcessWorkflow(result, language);
  },

  async generateAgentInstructions(workflow: Workflow, language: Language = 'zh-TW'): Promise<string> {
    const token = await getAuthToken();

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
        throw new Error(`餘額不足。需要 $${error.required}，目前餘額 $${error.balance}`);
      }
      throw new Error(error.error || 'Failed to generate instructions');
    }

    const { result } = await response.json();
    return result;
  }
};
