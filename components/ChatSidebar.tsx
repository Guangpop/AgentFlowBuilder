
import React, { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface Props {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading: boolean;
  confirmation: string | null;
}

const ChatSidebar: React.FC<Props> = ({ onGenerate, isLoading, confirmation }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onGenerate(prompt);
    setPrompt('');
  };

  return (
    <div className="w-96 flex flex-col border-r border-slate-800 bg-slate-900 shadow-2xl z-10">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">工作流引擎</h1>
            <p className="text-xs text-slate-500">將創意轉化為 Agent 邏輯</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-sm text-slate-300 leading-relaxed">
              描述你想建立的 AI Agent 工作流。我會將其分解為節點、條件分支與回圈。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['客戶支持', '新聞聚合器', '代碼審查員'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setPrompt(`建立一個帶有反饋回圈的${tag}工作流`)}
                  className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {confirmation && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-blue-900/30 text-blue-100 text-sm p-3 rounded-2xl rounded-tl-none border border-blue-800/50 italic">
                {confirmation}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 text-slate-500 animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">正在規劃節點與連接關係...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="例如：建立一個流程，讀取使用者郵件、總結內容、請求確認，最後發送回覆..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-24"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg transition-all shadow-lg disabled:shadow-none"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className="mt-3 text-[10px] text-center text-slate-600 uppercase font-bold tracking-widest">
          由 Gemini 3 Flash 提供技術支持
        </p>
      </div>
    </div>
  );
};

export default ChatSidebar;
