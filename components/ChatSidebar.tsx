import React, { useState } from 'react';
import { Send, Loader2, Sparkles, Edit3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  confirmation: string | null;
  workflowDescription: string;
  onUpdateDescription: (val: string) => void;
}

const ChatSidebar: React.FC<Props> = ({ onGenerate, isLoading, confirmation, workflowDescription, onUpdateDescription }) => {
  const { theme, themeId } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onGenerate(prompt);
    setPrompt('');
  };

  return (
    <div className={`w-[420px] flex flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} shadow-[10px_0_40px_rgba(0,0,0,0.4)] z-10 transition-colors duration-500`}>
      <div className={`p-8 border-b ${theme.borderColorLight}`}>
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-blue-600 rounded-xl shadow-xl shadow-blue-900/30">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-black ${theme.textPrimary} tracking-tight`}>工作流構建引擎</h1>
            <p className={`text-xs ${theme.textMuted} font-bold uppercase tracking-widest`}>AI Agent Workflow Builder</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* 工作流描述編輯區 */}
        <div className={`${theme.bgCard} ${theme.borderRadiusXl} p-6 border ${theme.borderColorLight} group`}>
          <div className="flex items-center justify-between mb-3">
             <label className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>工作流核心描述</label>
             {!isEditingDesc && (
               <button onClick={() => setIsEditingDesc(true)} className={`opacity-0 group-hover:opacity-100 p-1.5 ${theme.bgCardHover} ${theme.borderRadius} transition-all ${theme.textMuted}`}>
                  <Edit3 size={14} />
               </button>
             )}
          </div>
          {isEditingDesc ? (
             <textarea
               autoFocus
               value={workflowDescription}
               onChange={(e) => onUpdateDescription(e.target.value)}
               onBlur={() => setIsEditingDesc(false)}
               className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} p-4 text-sm ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-32`}
             />
          ) : (
             <p onClick={() => setIsEditingDesc(true)} className={`text-sm ${theme.textSecondary} leading-relaxed font-medium cursor-pointer hover:${theme.textPrimary} transition-colors italic`}>
               "{workflowDescription}"
             </p>
          )}
        </div>

        <div className="space-y-6">
          <div className={`${themeId === 'minimal' ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/10 border-blue-500/20'} ${theme.borderRadiusXl} p-6 border shadow-inner`}>
            <p className={`text-base ${themeId === 'minimal' ? 'text-blue-900' : 'text-blue-100'} leading-relaxed font-medium`}>
              請輸入 AI Agent 工作流需求。
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {['客戶支持系統', '新聞自動摘要', '代碼審查助手', '智能銷售管家'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setPrompt(`建立一個帶有反饋回圈的${tag}工作流`)}
                  className={`text-xs px-3 py-1.5 ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} transition-all border ${theme.borderColor}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {confirmation && (
            <div className="flex gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className={`${themeId === 'minimal' ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-blue-900/20 text-blue-100 border-blue-800/30'} text-base p-5 ${theme.borderRadiusXl} rounded-tl-none border italic leading-relaxed ${theme.shadow}`}>
                {confirmation}
              </div>
            </div>
          )}

          {isLoading && (
            <div className={`flex items-center gap-4 text-blue-400 animate-pulse ${themeId === 'minimal' ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/5 border-blue-500/10'} p-4 ${theme.borderRadiusLg} border`}>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-bold tracking-wide">正在規劃節點邏輯與連線結構...</span>
            </div>
          )}
        </div>
      </div>

      <div className={`p-8 border-t ${theme.borderColorLight} ${theme.sidebarBg} ${theme.blur}`}>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="例如：建立一個流程，先讀取郵件、總結、請求人工確認..."
            className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadiusLg} py-5 pl-6 pr-14 text-base ${theme.textPrimary} placeholder:${theme.textMuted} focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all resize-none h-32 leading-relaxed shadow-inner`}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`absolute bottom-4 right-4 p-3 bg-blue-600 hover:bg-blue-500 disabled:${theme.bgTertiary} text-white ${theme.borderRadius} transition-all shadow-xl disabled:shadow-none active:scale-90`}
          >
            {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </form>
        <p className={`mt-4 text-[9px] text-center ${theme.textMuted} uppercase font-black tracking-[0.2em]`}>
          Powered by Gemini 3 Flash Engine
        </p>
      </div>
    </div>
  );
};

export default ChatSidebar;
