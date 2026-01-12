
import React, { useState } from 'react';
import { Send, Loader2, Sparkles, Edit3 } from 'lucide-react';

interface Props {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  confirmation: string | null;
  workflowDescription: string;
  onUpdateDescription: (val: string) => void;
}

const ChatSidebar: React.FC<Props> = ({ onGenerate, isLoading, confirmation, workflowDescription, onUpdateDescription }) => {
  const [prompt, setPrompt] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onGenerate(prompt);
    setPrompt('');
  };

  return (
    <div className="w-[420px] flex flex-col border-r border-slate-800 bg-slate-900 shadow-[10px_0_40px_rgba(0,0,0,0.4)] z-10">
      <div className="p-8 border-b border-slate-800">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-blue-600 rounded-xl shadow-xl shadow-blue-900/30">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">工作流構建引擎</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">AI Agent Workflow Builder</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* 工作流描述編輯區 */}
        <div className="bg-slate-800/20 rounded-3xl p-6 border border-slate-700/30 group">
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">工作流核心描述</label>
             {!isEditingDesc && (
               <button onClick={() => setIsEditingDesc(true)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded-lg transition-all text-slate-400">
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
               className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none h-32"
             />
          ) : (
             <p onClick={() => setIsEditingDesc(true)} className="text-sm text-slate-400 leading-relaxed font-medium cursor-pointer hover:text-slate-200 transition-colors italic">
               "{workflowDescription}"
             </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-blue-900/10 rounded-3xl p-6 border border-blue-500/20 shadow-inner">
            <p className="text-base text-blue-100 leading-relaxed font-medium">
              請輸入 AI Agent 工作流需求。
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {['客戶支持系統', '新聞自動摘要', '代碼審查助手', '智能銷售管家'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setPrompt(`建立一個帶有反饋回圈的${tag}工作流`)}
                  className="text-xs px-3 py-1.5 bg-slate-800/60 hover:bg-slate-600 text-slate-200 rounded-lg transition-all border border-slate-600/30"
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
              <div className="bg-blue-900/20 text-blue-100 text-base p-5 rounded-3xl rounded-tl-none border border-blue-800/30 italic leading-relaxed shadow-lg">
                {confirmation}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-4 text-blue-400 animate-pulse bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-bold tracking-wide">正在規劃節點邏輯與連線結構...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="例如：建立一個流程，先讀取郵件、總結、請求人工確認..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-5 pl-6 pr-14 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all resize-none h-32 leading-relaxed shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute bottom-4 right-4 p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl transition-all shadow-xl disabled:shadow-none active:scale-90"
          >
            {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </form>
        <p className="mt-4 text-[9px] text-center text-slate-600 uppercase font-black tracking-[0.2em]">
          Powered by Gemini 3 Flash Engine
        </p>
      </div>
    </div>
  );
};

export default ChatSidebar;
