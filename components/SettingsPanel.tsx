import React from 'react';
import { X, Settings, RotateCcw, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeId, themeOrder } from '../styles/themes';
import ThemePreviewCard from './ThemePreviewCard';

interface Props {
  onClose: () => void;
}

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
    <div className={`w-[300px] border-l ${theme.sidebarBorder} ${theme.sidebarBg} flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-30 overflow-hidden animate-in slide-in-from-right duration-300`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
        <h2 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}>
          <Settings size={14} className="text-blue-500" />
          設定
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
        {/* Theme Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-blue-400" />
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
              外觀主題
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

        {/* Divider */}
        <div className={`border-t ${theme.borderColorLight}`} />

        {/* Future Settings Placeholder */}
        <div className="space-y-2.5">
          <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>
            更多設定（即將推出）
          </label>
          <div className={`p-3 ${theme.bgCard} ${theme.borderRadius} border ${theme.borderColor} space-y-2`}>
            {[
              { label: '界面語言', value: '繁體中文', disabled: true },
              { label: '畫布網格', value: '顯示', disabled: true },
              { label: '快捷鍵提示', value: '開啟', disabled: true },
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between py-1.5 ${idx !== 2 ? `border-b ${theme.borderColorLight}` : ''}`}>
                <span className={`text-xs ${theme.textSecondary}`}>{item.label}</span>
                <span className={`text-xs ${theme.textMuted} italic`}>{item.value}</span>
              </div>
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
          重置為預設值
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
