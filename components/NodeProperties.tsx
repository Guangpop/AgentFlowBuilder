
import React, { useState, useEffect } from 'react';
import { WorkflowNode } from '../types';
import { NODE_COLORS, NODE_ICONS } from '../constants';
import { X, ArrowRight, Trash2, List, Settings, Plus, Minus, Info } from 'lucide-react';

interface Props {
  node: WorkflowNode | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
}

const NodeProperties: React.FC<Props> = ({ node, onClose, onDelete, onUpdate }) => {
  const [localNodeId, setLocalNodeId] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  useEffect(() => {
    if (node) {
      setLocalNodeId(node.node_id);
      setLocalDescription(node.description);
    }
  }, [node]);

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

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/95 backdrop-blur-xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] z-30 overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Settings size={14} className="text-blue-500" />
          Inspector
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {/* Node Identity */}
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border-2 shadow-inner transition-colors duration-500 ${style.bg} ${style.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={style.icon}>{NODE_ICONS[node.node_type]}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{node.node_type}</span>
            </div>
            <input 
              value={localNodeId}
              onChange={(e) => setLocalNodeId(e.target.value)}
              onBlur={() => onUpdate({ node_id: localNodeId })}
              placeholder="Node ID"
              className="w-full bg-transparent text-sm font-bold text-white border-b border-white/10 focus:border-blue-500 focus:outline-none py-1 transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Info size={10} />
              節點描述
            </label>
            <textarea 
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={() => onUpdate({ description: localDescription })}
              className="w-full bg-slate-800/30 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none h-24 leading-relaxed placeholder:text-slate-600 shadow-inner"
              placeholder="描述此節點的用途與行為..."
            />
          </div>
        </div>

        {/* Input Ports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              輸入端點
            </label>
            <button onClick={() => addPort('inputs')} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold transition-all border border-blue-500/20">
              <Plus size={10} />
              新增
            </button>
          </div>
          <div className="space-y-2">
            {node.inputs.length === 0 ? (
              <div className="py-6 px-4 border border-dashed border-slate-800 rounded-xl text-center">
                <p className="text-[10px] text-slate-600 italic">無輸入端點</p>
              </div>
            ) : (
              node.inputs.map((input, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className="w-2 h-2 rounded-full bg-slate-700 group-focus-within:bg-blue-500 transition-colors" />
                  <input 
                    value={input}
                    onChange={(e) => updatePort('inputs', i, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono focus:outline-none focus:border-blue-500 focus:text-white transition-all"
                  />
                  <button onClick={() => removePort('inputs', i)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Minus size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Output Ports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              輸出端點
            </label>
            <button onClick={() => addPort('outputs')} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all border border-emerald-500/20">
              <Plus size={10} />
              新增
            </button>
          </div>
          <div className="space-y-2">
            {node.outputs.length === 0 ? (
              <div className="py-6 px-4 border border-dashed border-slate-800 rounded-xl text-center">
                <p className="text-[10px] text-slate-600 italic">無輸出端點</p>
              </div>
            ) : (
              node.outputs.map((output, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input 
                    value={output}
                    onChange={(e) => updatePort('outputs', i, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono focus:outline-none focus:border-emerald-500 focus:text-white transition-all"
                  />
                  <button onClick={() => removePort('outputs', i)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Minus size={14} />
                  </button>
                  <div className="w-2 h-2 rounded-full bg-slate-700 group-focus-within:bg-emerald-500 transition-colors" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 border-t border-slate-800 bg-slate-950/20">
        <button 
          onClick={() => onDelete(node.node_id)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 rounded-2xl transition-all border border-rose-500/10 font-bold text-[10px] uppercase tracking-widest shadow-lg hover:shadow-rose-500/5"
        >
          <Trash2 size={14} />
          刪除此節點
        </button>
      </div>
    </div>
  );
};

export default NodeProperties;
