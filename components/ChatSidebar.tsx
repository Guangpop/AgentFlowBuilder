import React, { useState } from 'react';
import { Send, Loader2, Sparkles, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { isProductionMode } from '../lib/mode';

interface Props {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  confirmation: string | null;
}

const ChatSidebar: React.FC<Props> = ({ onGenerate, isLoading, confirmation }) => {
  const { theme, themeId, t } = useTheme();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onGenerate(prompt);
    setPrompt('');
  };

  const quickTags = [
    { key: 'customerSupport', label: t.tagCustomerSupport },
    { key: 'newsSummary', label: t.tagNewsSummary },
    { key: 'codeReview', label: t.tagCodeReview },
    { key: 'salesAssistant', label: t.tagSalesAssistant },
  ];

  return (
    <div className={`w-[280px] flex flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} shadow-[4px_0_20px_rgba(0,0,0,0.3)] z-10 transition-colors duration-500`}>
      <div className={`px-4 py-3 border-b ${theme.borderColorLight}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-md shadow-blue-900/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className={`text-sm font-bold ${theme.textPrimary} tracking-tight`}>{t.sidebarTitle}</h1>
            <p className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>{t.sidebarSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-3">
          {isProductionMode && (
            <div className={`${themeId === 'minimal' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/10 border-amber-500/20'} ${theme.borderRadius} p-2.5 border`}>
              <div className="flex items-start gap-2">
                <Info size={14} className={`${themeId === 'minimal' ? 'text-amber-600' : 'text-amber-400'} shrink-0 mt-0.5`} />
                <div className={`text-[11px] ${themeId === 'minimal' ? 'text-amber-800' : 'text-amber-200'} leading-relaxed`}>
                  <p className="font-medium">{t.pricingTitle}</p>
                  <p className="mt-1 opacity-80">{t.pricingWorkflow}</p>
                  <p className="opacity-80">{t.pricingSop}</p>
                </div>
              </div>
            </div>
          )}
          <div className={`${themeId === 'minimal' ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/10 border-blue-500/20'} ${theme.borderRadius} p-3 border`}>
            <p className={`text-sm ${themeId === 'minimal' ? 'text-blue-900' : 'text-blue-100'} leading-relaxed`}>
              {t.promptInstruction}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {quickTags.map(tag => (
                <button
                  key={tag.key}
                  onClick={() => setPrompt(t.tagTemplate(tag.label))}
                  className={`text-[10px] px-2 py-1 ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} transition-all border ${theme.borderColor}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {confirmation && (
            <div className="flex gap-2.5 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className={`${themeId === 'minimal' ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-blue-900/20 text-blue-100 border-blue-800/30'} text-xs p-3 ${theme.borderRadius} rounded-tl-none border italic leading-relaxed`}>
                {confirmation}
              </div>
            </div>
          )}

          {isLoading && (
            <div className={`flex items-center gap-2 text-blue-400 animate-pulse ${themeId === 'minimal' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/5 border-blue-500/10'} p-2 ${theme.borderRadius} border`}>
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[11px] font-medium">{t.generatingMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className={`p-3 border-t ${theme.borderColorLight} ${theme.sidebarBg} ${theme.blur}`}>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder={t.promptPlaceholder}
            className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} py-2.5 pl-3 pr-10 text-xs ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none h-16 leading-relaxed`}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`absolute bottom-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:${theme.bgTertiary} text-white ${theme.borderRadius} transition-all shadow-md disabled:shadow-none active:scale-95`}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSidebar;
