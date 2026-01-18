import React from 'react';
import { X, Settings, RotateCcw, Check, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeId, themeOrder, themes } from '../styles/themes';

interface Props {
  onClose: () => void;
}

// 主題預覽卡片的小型預覽圖
const ThemePreview: React.FC<{ themeId: ThemeId }> = ({ themeId }) => {
  const previewStyles: Record<ThemeId, { bg: string; sidebar: string; card: string; accent: string }> = {
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
    bentoGrid: {
      bg: 'bg-slate-950',
      sidebar: 'bg-slate-800/50',
      card: 'bg-slate-800 border-slate-600',
      accent: 'bg-orange-500',
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

const SettingsPanel: React.FC<Props> = ({ onClose }) => {
  const { theme, themeId, setThemeId, resetSettings } = useTheme();

  const handleThemeChange = (id: ThemeId) => {
    setThemeId(id);
  };

  const handleReset = () => {
    if (confirm('確定要重置所有設定為預設值嗎？')) {
      resetSettings();
    }
  };

  return (
    <div className={`w-[420px] border-l ${theme.sidebarBorder} ${theme.sidebarBg} flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.9)] z-30 overflow-hidden animate-in slide-in-from-right duration-300`}>
      {/* Header */}
      <div className={`p-8 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
        <h2 className={`text-sm font-black ${theme.textMuted} uppercase tracking-[0.4em] flex items-center gap-4`}>
          <Settings size={22} className="text-blue-500" />
          設定
        </h2>
        <button
          onClick={onClose}
          className={`p-3 ${theme.bgCardHover} ${theme.borderRadiusLg} ${theme.textMuted} hover:${theme.textPrimary} transition-all`}
        >
          <X size={28} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        {/* Theme Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Palette size={18} className="text-blue-400" />
            <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
              外觀主題
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {themeOrder.map((id) => {
              const t = themes[id];
              const isSelected = themeId === id;

              return (
                <button
                  key={id}
                  onClick={() => handleThemeChange(id)}
                  className={`relative p-4 ${theme.borderRadius} border-2 transition-all duration-300 text-left group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20'
                      : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover}`
                  }`}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-white" />
                    </div>
                  )}

                  {/* Preview */}
                  <div className="mb-3">
                    <ThemePreview themeId={id} />
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
                      {t.name}
                    </h3>
                    <p className={`text-[10px] ${theme.textMuted} leading-relaxed`}>
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${theme.borderColorLight}`} />

        {/* Future Settings Placeholder */}
        <div className="space-y-4">
          <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest px-1`}>
            更多設定（即將推出）
          </label>
          <div className={`p-6 ${theme.bgCard} ${theme.borderRadiusLg} border ${theme.borderColor} space-y-3`}>
            {[
              { label: '界面語言', value: '繁體中文', disabled: true },
              { label: '畫布網格', value: '顯示', disabled: true },
              { label: '快捷鍵提示', value: '開啟', disabled: true },
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between py-2 ${idx !== 2 ? `border-b ${theme.borderColorLight}` : ''}`}>
                <span className={`text-sm ${theme.textSecondary}`}>{item.label}</span>
                <span className={`text-sm ${theme.textMuted} italic`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-8 border-t ${theme.borderColorLight} ${theme.bgSecondary}`}>
        <button
          onClick={handleReset}
          className={`w-full flex items-center justify-center gap-3 py-4 ${theme.bgCard} ${theme.bgCardHover} ${theme.textMuted} ${theme.borderRadiusXl} transition-all border ${theme.borderColor} text-sm font-bold uppercase tracking-widest`}
        >
          <RotateCcw size={18} />
          重置為預設值
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
