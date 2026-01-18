import React from 'react';
import { Check } from 'lucide-react';
import { ThemeId, themes } from '../styles/themes';
import { useTheme } from '../contexts/ThemeContext';

interface ThemePreviewCardProps {
  themeId: ThemeId;
  isSelected: boolean;
  onSelect: (id: ThemeId) => void;
}

// 主題預覽縮略圖 - 呈現佈局結構
const ThemePreview: React.FC<{ themeId: ThemeId }> = ({ themeId }) => {
  const previewStyles: Record<ThemeId, {
    bg: string;
    sidebar: string;
    card: string;
    accent: string;
  }> = {
    techDark: {
      bg: 'bg-slate-900',
      sidebar: 'bg-slate-800',
      card: 'bg-slate-700 border-blue-500',
      accent: 'bg-blue-500',
    },
    glassmorphism: {
      bg: 'bg-gradient-to-br from-indigo-950 to-purple-950',
      sidebar: 'bg-white/10',
      card: 'bg-white/20 border-white/30',
      accent: 'bg-violet-500',
    },
    minimal: {
      bg: 'bg-slate-100',
      sidebar: 'bg-white',
      card: 'bg-white border-slate-300',
      accent: 'bg-slate-800',
    },
  };

  const style = previewStyles[themeId];

  return (
    <div className={`w-full h-20 ${style.bg} rounded-lg overflow-hidden flex p-1.5 gap-1`}>
      {/* Sidebar */}
      <div className={`w-6 ${style.sidebar} rounded-md`} />
      {/* Canvas */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Header */}
        <div className={`h-2 ${style.sidebar} rounded-sm`} />
        {/* Content */}
        <div className="flex-1 flex items-center justify-center gap-1">
          <div className={`w-8 h-6 ${style.card} border rounded-md flex items-center justify-center`}>
            <div className={`w-2 h-2 ${style.accent} rounded-sm`} />
          </div>
          <div className="text-slate-500 text-[8px]">→</div>
          <div className={`w-8 h-6 ${style.card} border rounded-md flex items-center justify-center`}>
            <div className={`w-2 h-2 ${style.accent} rounded-sm`} />
          </div>
        </div>
      </div>
      {/* Right panel */}
      <div className={`w-5 ${style.sidebar} rounded-md`} />
    </div>
  );
};

const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({ themeId, isSelected, onSelect }) => {
  const { theme } = useTheme();
  const t = themes[themeId];

  return (
    <button
      onClick={() => onSelect(themeId)}
      className={`relative p-2.5 ${theme.borderRadius} border transition-all duration-300 text-left group flex items-center gap-3 ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
          : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover}`
      }`}
    >
      {/* Preview */}
      <div className="w-16 shrink-0">
        <ThemePreview themeId={themeId} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-2`}>
          {t.name}
          {isSelected && (
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <Check size={10} className="text-white" />
            </div>
          )}
        </h3>
        <p className={`text-[9px] ${theme.textMuted} truncate`}>
          {t.description}
        </p>
      </div>
    </button>
  );
};

export default ThemePreviewCard;
