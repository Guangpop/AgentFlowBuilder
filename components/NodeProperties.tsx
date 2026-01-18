import React from 'react';
import { WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS, NODE_DISPLAY_NAMES } from '../constants';
import { X, Trash2, Settings, Plus, Minus, Info, Terminal, Wrench, Cpu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  node: WorkflowNode | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

const NodeProperties: React.FC<Props> = ({ node, onClose, onDelete, onUpdate }) => {
  const { theme, themeId } = useTheme();

  if (!node || Object.keys(node).length === 0) return null;

  const style = NODE_COLORS[node.node_type];

  const updatePort = (type: 'inputs' | 'outputs', index: number, value: string) => {
    const ports = [...node[type]];
    ports[index] = value;
    onUpdate({ [type]: ports });
  };

  const addPort = (type: 'inputs' | 'outputs') => {
    onUpdate({ [type]: [...node[type], type === 'inputs' ? '新輸入' : '新輸出'] });
  };

  const removePort = (type: 'inputs' | 'outputs', index: number) => {
    const ports = node[type].filter((_, i) => i !== index);
    onUpdate({ [type]: ports });
  };

  const updateConfig = (key: string, value: any) => {
    onUpdate({
      config: {
        ...node.config,
        [key]: value
      }
    });
  };

  return (
    <div className={`w-[420px] border-l ${theme.sidebarBorder} ${theme.sidebarBg} ${theme.blur} flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.9)] z-30 overflow-hidden animate-in slide-in-from-right duration-300 transition-colors duration-500`}>
      <div className={`p-8 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
        <h2 className={`text-sm font-black ${theme.textMuted} uppercase tracking-[0.4em] flex items-center gap-4`}>
          <Settings size={22} className="text-blue-500" />
          元件屬性面板
        </h2>
        <button onClick={onClose} className={`p-3 ${theme.bgCardHover} ${theme.borderRadiusLg} ${theme.textMuted} hover:${theme.textPrimary} transition-all`}>
          <X size={28} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-12">
        {/* Node Identity Card */}
        <div className="space-y-6">
          <div className={`p-8 rounded-[40px] border-2 shadow-2xl transition-all duration-500 ${style.bg} ${style.border}`}>
            <div className="flex items-center gap-5 mb-8">
              <div className="p-4 bg-white/10 rounded-2xl shrink-0 shadow-lg scale-110">
                {NODE_ICONS[node.node_type]}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black uppercase tracking-widest text-white leading-none mb-1">
                  {NODE_DISPLAY_NAMES[node.node_type]}
                </span>
                <span className="text-[10px] text-white/30 font-mono tracking-widest">COMPONENT MODULE</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Node Identifier</label>
              <input 
                value={node.node_id}
                onChange={(e) => onUpdate({ node_id: e.target.value })}
                placeholder="節點 ID"
                className="w-full bg-white/5 rounded-2xl px-6 py-4 text-xl font-black text-white border border-white/5 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest flex items-center gap-3 px-1`}>
              <Info size={18} className="text-blue-400 opacity-60" />
              節點邏輯功能描述
            </label>
            <textarea
              value={node.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className={`w-full ${theme.bgCard} p-8 ${theme.borderRadiusXl} border ${theme.borderColor} text-lg font-medium ${theme.textSecondary} focus:outline-none focus:ring-4 focus:ring-blue-500/20 resize-none h-56 leading-relaxed ${theme.shadowXl}`}
              placeholder="詳細說明此元件的職責..."
            />
          </div>
        </div>

        {/* Script Execution Config */}
        {node.node_type === NodeType.ScriptExecution && (
          <div className={`space-y-6 pt-2 border-t ${theme.borderColorLight}`}>
             <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}>
                 <Terminal size={14} className={theme.textMuted}/> 腳本執行設定
             </label>
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-wider pl-2`}>Script Type</label>
                   <select
                      value={node.config?.scriptType || 'python'}
                      onChange={(e) => updateConfig('scriptType', e.target.value)}
                      className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-4 py-3 text-sm ${theme.textPrimary} focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer`}
                   >
                      <option value="python">Python Script (.py)</option>
                      <option value="shell">Shell / Bash Script (.sh)</option>
                      <option value="javascript">Node.js Script (.js)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-wider pl-2`}>Source Code</label>
                   <textarea
                      value={node.config?.scriptContent || ''}
                      onChange={(e) => updateConfig('scriptContent', e.target.value)}
                      placeholder="# 請在此輸入腳本代碼..."
                      className={`w-full ${theme.bgPrimary} border ${theme.borderColor} ${theme.borderRadius} p-4 text-sm font-mono text-emerald-400 focus:outline-none focus:border-blue-500 h-48 resize-none leading-relaxed`}
                   />
                </div>
                <p className={`text-[10px] ${themeId === 'minimal' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-orange-400/70 bg-orange-900/10 border-orange-500/10'} flex items-start gap-2 p-3 ${theme.borderRadius} border`}>
                    <Info size={12} className="shrink-0 mt-0.5" />
                    提示：生成的 Agent 將被指示將此內容編譯或保存為可執行檔案。
                </p>
             </div>
          </div>
        )}

        {/* MCP Tool Config */}
        {node.node_type === NodeType.MCPTool && (
          <div className={`space-y-6 pt-2 border-t ${theme.borderColorLight}`}>
             <label className="text-xs font-black text-pink-400/80 uppercase tracking-widest flex items-center gap-2">
                 <Wrench size={14} className="text-pink-400"/> MCP 工具配置
             </label>
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-wider pl-2`}>Tool Name</label>
                   <input
                      value={node.config?.toolName || ''}
                      onChange={(e) => updateConfig('toolName', e.target.value)}
                      placeholder="例如: google_search, file_system..."
                      className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-4 py-3 text-sm text-pink-200 font-mono focus:outline-none focus:border-pink-500 transition-all placeholder:${theme.textMuted}`}
                   />
                </div>
                <p className={`text-[10px] ${themeId === 'minimal' ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-pink-400/60 bg-pink-900/10 border-pink-500/10'} flex items-start gap-2 p-3 ${theme.borderRadius} border`}>
                    <Info size={12} className="shrink-0 mt-0.5" />
                    提示：Agent 將根據上下文自動推斷調用此工具所需的參數。
                </p>
             </div>
          </div>
        )}

        {/* Agent Skill Config */}
        {node.node_type === NodeType.AgentSkill && (
          <div className={`space-y-6 pt-2 border-t ${theme.borderColorLight}`}>
             <label className="text-xs font-black text-amber-400/80 uppercase tracking-widest flex items-center gap-2">
                 <Cpu size={14} className="text-amber-400"/> Agent Skill 設定
             </label>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-wider pl-2`}>Provider</label>
                     <input
                        value={node.config?.provider || ''}
                        onChange={(e) => updateConfig('provider', e.target.value)}
                        placeholder="例如: superpower"
                        className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-4 py-3 text-sm text-amber-200 font-mono focus:outline-none focus:border-amber-500 transition-all placeholder:${theme.textMuted}`}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-wider pl-2`}>Skill</label>
                     <input
                        value={node.config?.skill || ''}
                        onChange={(e) => updateConfig('skill', e.target.value)}
                        placeholder="例如: brain_storm"
                        className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-4 py-3 text-sm text-amber-200 font-mono focus:outline-none focus:border-amber-500 transition-all placeholder:${theme.textMuted}`}
                     />
                  </div>
                </div>

                {/* Preview Box */}
                <div className={`${theme.bgPrimary} border ${theme.borderColor} ${theme.borderRadius} p-4 flex items-center justify-between`}>
                   <div className="flex flex-col">
                      <span className={`text-[10px] ${theme.textMuted} font-bold uppercase tracking-widest mb-1`}>SKILL FORMULA PREVIEW</span>
                      <code className="text-sm font-mono text-amber-400">
                        {node.config?.provider || 'provider'}:{node.config?.skill || 'skill'}
                      </code>
                   </div>
                </div>

                <p className={`text-[10px] ${themeId === 'minimal' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-amber-400/60 bg-amber-900/10 border-amber-500/10'} flex items-start gap-2 p-3 ${theme.borderRadius} border`}>
                    <Info size={12} className="shrink-0 mt-0.5" />
                    提示：這將生成特定的技能調用指令，請確保 Provider 與 Skill 名稱準確。
                </p>
             </div>
          </div>
        )}

        {/* Input Ports Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest flex items-center gap-3`}>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.7)]" />
              輸入端口 (Input Ports)
            </label>
            <button onClick={() => addPort('inputs')} className={`flex items-center gap-2 px-5 py-2.5 ${themeId === 'minimal' ? 'bg-blue-50 hover:bg-blue-100 border-blue-200' : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20'} text-blue-400 ${theme.borderRadius} text-xs font-black transition-all border active:scale-95 uppercase tracking-widest`}>
              <Plus size={18} />
              Add Port
            </button>
          </div>
          <div className="space-y-4">
            {node.inputs.length === 0 ? (
              <div className={`py-12 px-8 border-2 border-dashed ${theme.borderColor} ${theme.borderRadiusXl} text-center ${theme.bgCard}`}>
                <p className={`text-sm ${theme.textMuted} font-bold italic`}>該節點目前無輸入端口</p>
              </div>
            ) : (
              node.inputs.map((input, i) => (
                <div key={i} className="flex items-center gap-4 group animate-in slide-in-from-left duration-300">
                  <div className={`w-3 h-3 rounded-full ${theme.bgTertiary} group-focus-within:bg-blue-500 transition-all shrink-0`} />
                  <input
                    value={input}
                    onChange={(e) => updatePort('inputs', i, e.target.value)}
                    className={`flex-1 px-6 py-4 ${theme.bgCard} border ${theme.borderColor} ${theme.borderRadiusLg} text-sm ${theme.textSecondary} font-mono font-bold focus:outline-none focus:border-blue-500 focus:${theme.textPrimary} transition-all ${theme.shadow}`}
                  />
                  <button onClick={() => removePort('inputs', i)} className={`p-3 ${theme.textMuted} hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90`}>
                    <Minus size={22} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Output Ports Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <label className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest flex items-center gap-3`}>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
              輸出端口 (Output Ports)
            </label>
            <button onClick={() => addPort('outputs')} className={`flex items-center gap-2 px-5 py-2.5 ${themeId === 'minimal' ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'} text-emerald-400 ${theme.borderRadius} text-xs font-black transition-all border active:scale-95 uppercase tracking-widest`}>
              <Plus size={18} />
              Add Port
            </button>
          </div>
          <div className="space-y-4">
            {node.outputs.length === 0 ? (
              <div className={`py-12 px-8 border-2 border-dashed ${theme.borderColor} ${theme.borderRadiusXl} text-center ${theme.bgCard}`}>
                <p className={`text-sm ${theme.textMuted} font-bold italic`}>該節點目前無輸出端口</p>
              </div>
            ) : (
              node.outputs.map((output, i) => (
                <div key={i} className="flex items-center gap-4 group animate-in slide-in-from-right duration-300">
                  <input
                    value={output}
                    onChange={(e) => updatePort('outputs', i, e.target.value)}
                    className={`flex-1 px-6 py-4 ${theme.bgCard} border ${theme.borderColor} ${theme.borderRadiusLg} text-sm ${theme.textSecondary} font-mono font-bold focus:outline-none focus:border-emerald-500 focus:${theme.textPrimary} transition-all ${theme.shadow}`}
                  />
                  <button onClick={() => removePort('outputs', i)} className={`p-3 ${theme.textMuted} hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90`}>
                    <Minus size={22} />
                  </button>
                  <div className={`w-3 h-3 rounded-full ${theme.bgTertiary} group-focus-within:bg-emerald-500 transition-all shrink-0`} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`p-10 border-t ${theme.borderColorLight} ${theme.bgSecondary}`}>
        <button
          onClick={() => onDelete(node.node_id)}
          className={`w-full flex items-center justify-center gap-4 py-6 ${themeId === 'minimal' ? 'bg-rose-50 hover:bg-rose-100 border-rose-200' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'} text-rose-500 ${theme.borderRadiusXl} transition-all border font-black text-sm uppercase tracking-[0.3em] ${theme.shadowXl} hover:shadow-rose-500/10 active:scale-95`}
        >
          <Trash2 size={22} />
          徹底移除此節點
        </button>
      </div>
    </div>
  );
};

export default NodeProperties;