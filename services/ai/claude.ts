import { Workflow, WorkflowResponse } from "../../types";
import { Language, getLocale } from "../../locales";
import { AIProvider, AI_PROVIDERS } from "./types";
import { postProcessWorkflow } from "./postProcess";
import { supabase } from "../../lib/supabase";

// Get auth token for API calls
const getAuthToken = async (language: Language): Promise<string> => {
  const t = getLocale(language);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error(t.alertNotAuthenticated);
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

    // Backend returns structured data from tool use directly
    return postProcessWorkflow(result, language);
  },

  async generateAgentInstructions(workflow: Workflow, language: Language = 'zh-TW'): Promise<string> {
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
  }
};
