import React from 'react';
import { X, Settings, RotateCcw, Palette, Globe, Check, Cpu } from 'lucide-react';
import { useTheme, Language, AIProviderType } from '../contexts/ThemeContext';
import { ThemeId, themeOrder } from '../styles/themes';
import { languages } from '../locales';
import { AI_PROVIDERS } from '../services/ai';
import ThemePreviewCard from './ThemePreviewCard';

interface Props {
  onClose: () => void;
}

const SettingsPanel: React.FC<Props> = ({ onClose }) => {
  const { theme, themeId, setThemeId, language, setLanguage, aiProvider, setAiProvider, t, resetSettings } = useTheme();

  const handleThemeChange = (id: ThemeId) => {
    setThemeId(id);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleProviderChange = (provider: AIProviderType) => {
    setAiProvider(provider);
  };

  const handleReset = () => {
    if (confirm(t.resetConfirm)) {
      resetSettings();
    }
  };

  return (
    <div className={`w-[300px] border-l ${theme.sidebarBorder} ${theme.sidebarBg} flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-30 overflow-hidden animate-in slide-in-from-right duration-300`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
        <h2 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}>
          <Settings size={14} className="text-blue-500" />
          {t.settingsTitle}
        </h2>
        <button
          onClick={onClose}
          className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:${theme.textPrimary} transition-all`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Language Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-emerald-400" />
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
              {t.languageLabel}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(languages) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`relative p-3 ${theme.borderRadius} border transition-all text-left ${
                  language === lang
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover}`
                }`}
              >
                <span className={`text-xs font-bold ${theme.textPrimary}`}>
                  {languages[lang].nativeName}
                </span>
                {language === lang && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${theme.borderColorLight}`} />

        {/* AI Provider Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-violet-400" />
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
              {t.aiProviderLabel}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(AI_PROVIDERS) as AIProviderType[]).map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`relative p-3 ${theme.borderRadius} border transition-all text-left ${
                  aiProvider === provider
                    ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20'
                    : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover}`
                }`}
              >
                <span className={`text-xs font-bold ${theme.textPrimary}`}>
                  {AI_PROVIDERS[provider].name}
                </span>
                {aiProvider === provider && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${theme.borderColorLight}`} />

        {/* Theme Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-blue-400" />
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
              {t.themeLabel}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {themeOrder.map((id) => (
              <ThemePreviewCard
                key={id}
                themeId={id}
                isSelected={themeId === id}
                onSelect={handleThemeChange}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${theme.borderColorLight} ${theme.bgSecondary}`}>
        <button
          onClick={handleReset}
          className={`w-full flex items-center justify-center gap-2 py-2 ${theme.bgCard} ${theme.bgCardHover} ${theme.textMuted} ${theme.borderRadius} transition-all border ${theme.borderColor} text-xs font-medium`}
        >
          <RotateCcw size={14} />
          {t.resetToDefault}
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
