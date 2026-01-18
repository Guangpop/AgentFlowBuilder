import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ThemeId, ThemeTokens, themes, getTheme } from '../styles/themes';
import { Language, detectBrowserLanguage, isValidLanguage, getLocale, LocaleStrings } from '../locales';
import { AIProviderType, AI_PROVIDERS, getAIProvider } from '../services/ai';

const STORAGE_KEY = 'agentflow-settings';

interface Settings {
  theme: ThemeId;
  language: Language;
  aiProvider: AIProviderType;
}

export type ApiStatus = 'active' | 'inactive';

interface ThemeContextType {
  theme: ThemeTokens;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: LocaleStrings;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
  apiStatus: ApiStatus;
  setApiStatus: (status: ApiStatus) => void;
  aiProvider: AIProviderType;
  setAiProvider: (provider: AIProviderType) => void;
}

const defaultSettings: Settings = {
  theme: 'techDark',
  language: detectBrowserLanguage(),
  aiProvider: 'gemini',
};

const isValidAiProvider = (provider: string): provider is AIProviderType => {
  return provider in AI_PROVIDERS;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isValidThemeId = (id: string): id is ThemeId => {
  return id in themes;
};

const loadSettings = (): Settings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate theme ID exists (in case it was removed)
      if (parsed.theme && !isValidThemeId(parsed.theme)) {
        console.warn(`Invalid theme ID "${parsed.theme}" found in storage, resetting to default`);
        parsed.theme = defaultSettings.theme;
      }
      // Validate language exists
      if (parsed.language && !isValidLanguage(parsed.language)) {
        console.warn(`Invalid language "${parsed.language}" found in storage, detecting browser language`);
        parsed.language = detectBrowserLanguage();
      }
      // Validate AI provider exists
      if (parsed.aiProvider && !isValidAiProvider(parsed.aiProvider)) {
        console.warn(`Invalid AI provider "${parsed.aiProvider}" found in storage, resetting to default`);
        parsed.aiProvider = defaultSettings.aiProvider;
      }
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return defaultSettings;
};

const saveSettings = (settings: Settings): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Check if API key exists for a specific provider
const checkApiKeyExists = (provider: AIProviderType): boolean => {
  try {
    return getAIProvider(provider).checkApiKey();
  } catch {
    return false;
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiStatus, setApiStatusState] = useState<ApiStatus>('inactive');

  const setApiStatus = useCallback((status: ApiStatus) => {
    setApiStatusState(status);
  }, []);

  const setAiProvider = useCallback((provider: AIProviderType) => {
    setSettings(prev => ({ ...prev, aiProvider: provider }));
    // Update API status based on new provider
    setApiStatusState(checkApiKeyExists(provider) ? 'active' : 'inactive');
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
    // Check API key for loaded provider
    setApiStatusState(checkApiKeyExists(loaded.aiProvider) ? 'active' : 'inactive');
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  const setThemeId = useCallback((id: ThemeId) => {
    setSettings(prev => ({ ...prev, theme: id }));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setSettings(prev => ({ ...prev, language: lang }));
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    const newSettings = {
      ...defaultSettings,
      language: detectBrowserLanguage(), // Re-detect on reset
    };
    setSettings(newSettings);
    // Reset API status based on default provider
    setApiStatusState(checkApiKeyExists(newSettings.aiProvider) ? 'active' : 'inactive');
  }, []);

  const theme = getTheme(settings.theme);
  const t = getLocale(settings.language);

  const value: ThemeContextType = {
    theme,
    themeId: settings.theme,
    setThemeId,
    language: settings.language,
    setLanguage,
    t,
    settings,
    updateSettings,
    resetSettings,
    apiStatus,
    setApiStatus,
    aiProvider: settings.aiProvider,
    setAiProvider,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility hook to get combined class names based on theme
export const useThemeClasses = () => {
  const { theme } = useTheme();

  return {
    // Common combinations
    card: `${theme.bgCard} ${theme.borderColor} border ${theme.borderRadiusLg} ${theme.shadow}`,
    input: `${theme.bgInput} ${theme.borderColor} border ${theme.borderRadius} ${theme.textPrimary} focus:outline-none focus:ring-2 focus:ring-blue-500/30`,
    button: `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary} ${theme.borderRadius} transition-all`,
    panel: `${theme.sidebarBg} ${theme.sidebarBorder} border`,
  };
};

export type { Language };
export type { AIProviderType };
export default ThemeContext;
