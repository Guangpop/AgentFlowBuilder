import React, { useState, useEffect } from 'react';
import { WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS } from '../constants';
import { X, Trash2, Settings, Plus, Minus, Info, Terminal, Wrench, Cpu, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  node: WorkflowNode | null;
  allNodeIds: string[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

const MAX_DESCRIPTION_LENGTH = 350;

const NodeProperties: React.FC<Props> = ({ node, allNodeIds, onClose, onDelete, onUpdate }) => {
  const { theme, themeId, t } = useTheme();
  const [nodeIdError, setNodeIdError] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string>('');

  // Sync pendingNodeId with node.node_id when node changes
  useEffect(() => {
    if (node) {
      setPendingNodeId(node.node_id);
      setNodeIdError(null);
    }
  }, [node?.node_id]);

  // Helper to get node display name from translations
  const getNodeDisplayName = (type: NodeType): string => {
    const nameMap: Record<NodeType, string> = {
      [NodeType.UserInput]: t.nodeTypeUserInput,
      [NodeType.AgentReasoning]: t.nodeTypeAgentReasoning,
      [NodeType.Condition]: t.nodeTypeCondition,
      [NodeType.AgentQuestion]: t.nodeTypeAgentQuestion,
      [NodeType.UserResponse]: t.nodeTypeUserResponse,
      [NodeType.AgentAction]: t.nodeTypeAgentAction,
      [NodeType.ScriptExecution]: t.nodeTypeScriptExecution,
      [NodeType.MCPTool]: t.nodeTypeMCPTool,
      [NodeType.AgentSkill]: t.nodeTypeAgentSkill,
    };
    return nameMap[type];
  };

  if (!node || Object.keys(node).length === 0) return null;

  const style = NODE_COLORS[node.node_type];

  const updatePort = (type: 'inputs' | 'outputs', index: number, value: string) => {
    const ports = [...node[type]];
    ports[index] = value;
    onUpdate({ [type]: ports });
  };

  const addPort = (type: 'inputs' | 'outputs') => {
    onUpdate({ [type]: [...node[type], type === 'inputs' ? t.newInput : t.newOutput] });
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
    <div className={`w-[300px] border-l ${theme.sidebarBorder} ${theme.sidebarBg} ${theme.blur} flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-30 overflow-hidden animate-in slide-in-from-right duration-300 transition-colors duration-500`}>
      <div className={`px-4 py-3 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
        <h2 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}>
          <Settings size={14} className="text-blue-500" />
          {t.propertiesPanel}
        </h2>
        <button onClick={onClose} className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:${theme.textPrimary} transition-all`}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Node Identity Card */}
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border shadow-lg transition-all duration-500 ${style.bg} ${style.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg shrink-0">
                {NODE_ICONS[node.node_type]}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase tracking-wider text-white leading-none mb-0.5">
                  {getNodeDisplayName(node.node_type)}
                </span>
                <span className="text-[9px] text-white/40 font-mono tracking-wider">MODULE</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Node ID</label>
              <input
                value={pendingNodeId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setPendingNodeId(newId);

                  // Check for duplicate (exclude current node's original ID)
                  const otherNodeIds = allNodeIds.filter(id => id !== node.node_id);
                  if (otherNodeIds.includes(newId)) {
                    setNodeIdError(t.nodeIdDuplicate);
                  } else {
                    setNodeIdError(null);
                    onUpdate({ node_id: newId });
                  }
                }}
                placeholder={t.nodeIdPlaceholder}
                className={`w-full bg-white/5 rounded-lg px-3 py-2 text-sm font-bold text-white border ${
                  nodeIdError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-blue-500/50'
                } focus:bg-white/10 focus:outline-none transition-all`}
              />
              {nodeIdError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-medium mt-1">
                  <AlertCircle size={12} />
                  {nodeIdError}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider flex items-center gap-2`}>
              <Info size={12} className="text-blue-400 opacity-60" />
              {t.functionDescription}
            </label>
            <div className="relative">
              <textarea
                value={node.description}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                    onUpdate({ description: e.target.value });
                  }
                }}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`w-full ${theme.bgCard} p-3 ${theme.borderRadius} border ${theme.borderColor} text-sm ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24 leading-relaxed`}
                placeholder={t.descriptionHint}
              />
              <div className={`absolute bottom-2 right-2 text-xs ${
                node.description.length >= MAX_DESCRIPTION_LENGTH
                  ? 'text-red-400'
                  : theme.textMuted
              }`}>
                {node.description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>
          </div>
        </div>

        {/* Script Execution Config */}
        {node.node_type === NodeType.ScriptExecution && (
          <div className={`space-y-3 pt-3 border-t ${theme.borderColorLight}`}>
             <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider flex items-center gap-1.5`}>
                 <Terminal size={12} className={theme.textMuted}/> {t.scriptSettings}
             </label>
             <div className="space-y-2.5">
                <div className="space-y-1">
                   <label className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>Type</label>
                   <select
                      value={node.config?.scriptType || 'python'}
                      onChange={(e) => updateConfig('scriptType', e.target.value)}
                      className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-2.5 py-1.5 text-xs ${theme.textPrimary} focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer`}
                   >
                      <option value="python">{t.scriptTypePython}</option>
                      <option value="shell">{t.scriptTypeShell}</option>
                      <option value="javascript">{t.scriptTypeJs}</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>Source</label>
                   <textarea
                      value={node.config?.scriptContent || ''}
                      onChange={(e) => updateConfig('scriptContent', e.target.value)}
                      placeholder={t.scriptPlaceholder}
                      className={`w-full ${theme.bgPrimary} border ${theme.borderColor} ${theme.borderRadius} p-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500 h-28 resize-none leading-relaxed`}
                   />
                </div>
                <p className={`text-[9px] ${themeId === 'minimal' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-orange-400/70 bg-orange-900/10 border-orange-500/10'} flex items-start gap-1.5 p-2 ${theme.borderRadius} border`}>
                    <Info size={10} className="shrink-0 mt-0.5" />
                    {t.scriptHint}
                </p>
             </div>
          </div>
        )}

        {/* MCP Tool Config */}
        {node.node_type === NodeType.MCPTool && (
          <div className={`space-y-3 pt-3 border-t ${theme.borderColorLight}`}>
             <label className="text-[10px] font-bold text-pink-400/80 uppercase tracking-wider flex items-center gap-1.5">
                 <Wrench size={12} className="text-pink-400"/> {t.mcpTool}
             </label>
             <div className="space-y-2.5">
                <div className="space-y-1">
                   <label className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>Tool Name</label>
                   <input
                      value={node.config?.toolName || ''}
                      onChange={(e) => updateConfig('toolName', e.target.value)}
                      placeholder={t.toolNamePlaceholder}
                      className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-2.5 py-1.5 text-xs text-pink-200 font-mono focus:outline-none focus:border-pink-500 transition-all placeholder:${theme.textMuted}`}
                   />
                </div>
                <p className={`text-[9px] ${themeId === 'minimal' ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-pink-400/60 bg-pink-900/10 border-pink-500/10'} flex items-start gap-1.5 p-2 ${theme.borderRadius} border`}>
                    <Info size={10} className="shrink-0 mt-0.5" />
                    {t.mcpHint}
                </p>
             </div>
          </div>
        )}

        {/* Agent Skill Config */}
        {node.node_type === NodeType.AgentSkill && (
          <div className={`space-y-3 pt-3 border-t ${theme.borderColorLight}`}>
             <label className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-1.5">
                 <Cpu size={12} className="text-amber-400"/> {t.agentSkill}
             </label>
             <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                     <label className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>Provider</label>
                     <input
                        value={node.config?.provider || ''}
                        onChange={(e) => updateConfig('provider', e.target.value)}
                        placeholder={t.providerPlaceholder}
                        className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500 transition-all placeholder:${theme.textMuted}`}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>Skill</label>
                     <input
                        value={node.config?.skill || ''}
                        onChange={(e) => updateConfig('skill', e.target.value)}
                        placeholder={t.skillPlaceholder}
                        className={`w-full ${theme.bgInput} border ${theme.borderColor} ${theme.borderRadius} px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500 transition-all placeholder:${theme.textMuted}`}
                     />
                  </div>
                </div>

                {/* Preview Box */}
                <div className={`${theme.bgPrimary} border ${theme.borderColor} ${theme.borderRadius} px-2.5 py-2 flex items-center justify-between`}>
                   <div className="flex flex-col">
                      <span className={`text-[8px] ${theme.textMuted} font-medium uppercase tracking-wider mb-0.5`}>{t.preview}</span>
                      <code className="text-xs font-mono text-amber-400">
                        {node.config?.provider || 'provider'}:{node.config?.skill || 'skill'}
                      </code>
                   </div>
                </div>

                <p className={`text-[9px] ${themeId === 'minimal' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-amber-400/60 bg-amber-900/10 border-amber-500/10'} flex items-start gap-1.5 p-2 ${theme.borderRadius} border`}>
                    <Info size={10} className="shrink-0 mt-0.5" />
                    {t.skillHint}
                </p>
             </div>
          </div>
        )}

        {/* Input Ports Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider flex items-center gap-2`}>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              {t.inputPorts}
            </label>
            <button onClick={() => addPort('inputs')} className={`flex items-center gap-1 px-2 py-1 ${themeId === 'minimal' ? 'bg-blue-50 hover:bg-blue-100 border-blue-200' : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20'} text-blue-400 ${theme.borderRadius} text-[10px] font-bold transition-all border active:scale-95`}>
              <Plus size={12} />
              {t.add}
            </button>
          </div>
          <div className="space-y-2">
            {node.inputs.length === 0 ? (
              <div className={`py-4 px-3 border border-dashed ${theme.borderColor} ${theme.borderRadius} text-center ${theme.bgCard}`}>
                <p className={`text-xs ${theme.textMuted} italic`}>{t.noInputPorts}</p>
              </div>
            ) : (
              node.inputs.map((input, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className={`w-2 h-2 rounded-full ${theme.bgTertiary} group-focus-within:bg-blue-500 transition-all shrink-0`} />
                  <input
                    value={input}
                    onChange={(e) => updatePort('inputs', i, e.target.value)}
                    className={`flex-1 px-2.5 py-1.5 ${theme.bgCard} border ${theme.borderColor} ${theme.borderRadius} text-xs ${theme.textSecondary} font-mono focus:outline-none focus:border-blue-500 transition-all`}
                  />
                  <button onClick={() => removePort('inputs', i)} className={`p-1 ${theme.textMuted} hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100`}>
                    <Minus size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Output Ports Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider flex items-center gap-2`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              {t.outputPorts}
            </label>
            <button onClick={() => addPort('outputs')} className={`flex items-center gap-1 px-2 py-1 ${themeId === 'minimal' ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'} text-emerald-400 ${theme.borderRadius} text-[10px] font-bold transition-all border active:scale-95`}>
              <Plus size={12} />
              {t.add}
            </button>
          </div>
          <div className="space-y-2">
            {node.outputs.length === 0 ? (
              <div className={`py-4 px-3 border border-dashed ${theme.borderColor} ${theme.borderRadius} text-center ${theme.bgCard}`}>
                <p className={`text-xs ${theme.textMuted} italic`}>{t.noOutputPorts}</p>
              </div>
            ) : (
              node.outputs.map((output, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input
                    value={output}
                    onChange={(e) => updatePort('outputs', i, e.target.value)}
                    className={`flex-1 px-2.5 py-1.5 ${theme.bgCard} border ${theme.borderColor} ${theme.borderRadius} text-xs ${theme.textSecondary} font-mono focus:outline-none focus:border-emerald-500 transition-all`}
                  />
                  <button onClick={() => removePort('outputs', i)} className={`p-1 ${theme.textMuted} hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100`}>
                    <Minus size={14} />
                  </button>
                  <div className={`w-2 h-2 rounded-full ${theme.bgTertiary} group-focus-within:bg-emerald-500 transition-all shrink-0`} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`p-4 border-t ${theme.borderColorLight} ${theme.bgSecondary}`}>
        <button
          onClick={() => onDelete(node.node_id)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 ${themeId === 'minimal' ? 'bg-rose-50 hover:bg-rose-100 border-rose-200' : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'} text-rose-500 ${theme.borderRadius} transition-all border font-bold text-xs uppercase tracking-wider active:scale-98`}
        >
          <Trash2 size={14} />
          {t.removeNode}
        </button>
      </div>
    </div>
  );
};

export default NodeProperties;