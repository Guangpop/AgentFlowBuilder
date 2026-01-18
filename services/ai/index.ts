import type { AIProvider, AIProviderType } from './types';
import { AI_PROVIDERS } from './types';
import { geminiProvider } from './gemini';
import { claudeProvider } from './claude';

// Provider registry
const providers: Record<AIProviderType, AIProvider> = {
  gemini: geminiProvider,
  claude: claudeProvider,
};

/**
 * Get AI provider by type
 */
export function getAIProvider(type: AIProviderType): AIProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${type}`);
  }
  return provider;
}

/**
 * Get list of available providers (those with API keys configured)
 */
export function getAvailableProviders(): AIProviderType[] {
  return (Object.keys(providers) as AIProviderType[]).filter(
    type => providers[type].checkApiKey()
  );
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(type: AIProviderType): boolean {
  return providers[type]?.checkApiKey() ?? false;
}

// Re-export types and constants
export type { AIProvider, AIProviderType } from './types';
export { AI_PROVIDERS } from './types';
export { geminiProvider } from './gemini';
export { claudeProvider } from './claude';
