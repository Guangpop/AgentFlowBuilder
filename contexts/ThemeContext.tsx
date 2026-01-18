import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ThemeId, ThemeTokens, themes, getTheme } from '../styles/themes';

const STORAGE_KEY = 'agentflow-settings';

interface Settings {
  theme: ThemeId;
  // 未來擴充
  // language?: string;
  // showCanvasGrid?: boolean;
}

interface ThemeContextType {
  theme: ThemeTokens;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'techDark',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const loadSettings = (): Settings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
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

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const theme = getTheme(settings.theme);

  const value: ThemeContextType = {
    theme,
    themeId: settings.theme,
    setThemeId,
    settings,
    updateSettings,
    resetSettings,
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

export default ThemeContext;
