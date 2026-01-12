
import React, { useRef, useState, useEffect } from 'react';
import { Workflow, WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS } from '../constants';
import { Layers, Plus } from 'lucide-react';

interface Props {
  workflow: Workflow;
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, position: { x: number, y: number }) => void;
  onConnect: (sourceId: string, targetId: string, sourceIdx: number, targetIdx: number) => void;
  onAddNode: (type: NodeType) => void;
  selectedNodeId: string | null;
}

const WorkflowCanvas: React.FC<Props> = ({ workflow, onNodeClick, onNodeMove, onConnect, onAddNode, selectedNodeId }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // 連線狀態
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, portIdx: number, type: 'in' | 'out' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string, portIdx: number, type: 'in' | 'out' } | null>(null);

  // Added handleNodeDragStart to fix the reference error and enable node dragging functionality
  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only allow dragging with left mouse button
    
    setDraggedNodeId(nodeId);
    const node = workflow.nodes.find(n => n.node_id === nodeId);
    if (node) {
      // Store the relative starting position to handle movement correctly in onMouseMove
      setStartPos({
        x: e.clientX - offset.x - node.position.x * scale,
        y: e.clientY - offset.y - node.position.y * scale
      });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.workflow-node');
    const isNodeHeader = target.closest('.node-header');
    const isPort = target.closest('.port');
    const isToolbar = target.closest('.toolbar');
    
    if (isPort || isToolbar) return;

    // 點擊空白處或節點非標題處時
    if (!isNodeHeader) {
      // 如果不是在連線過程中點擊端點，則清除連線狀態
      if (!isPort) setConnectionStart(null);
      // 如果沒點到節點，清除選擇
      if (!isNode) onNodeClick({} as WorkflowNode); 
    }

    if (e.button === 1 || (e.button === 0 && e.ctrlKey) || (!isNodeHeader && e.button === 0)) {
      setIsPanning(true);
      setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentMouseCanvasPos = {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale
    };

    if (isPanning) {
      setOffset({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    } else if (draggedNodeId) {
      onNodeMove(draggedNodeId, {
        x: (e.clientX - offset.x - startPos.x) / scale,
        y: (e.clientY - offset.y - startPos.y) / scale
      });
    }

    if (connectionStart) {
      setMousePos(currentMouseCanvasPos);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggedNodeId(null);

    // 完成連線 (Drag & Drop 模式)
    if (connectionStart && hoveredPort) {
      if (connectionStart.type !== hoveredPort.type && connectionStart.nodeId !== hoveredPort.nodeId) {
        const source = connectionStart.type === 'out' ? connectionStart : hoveredPort;
        const target = connectionStart.type === 'in' ? connectionStart : hoveredPort;
        onConnect(source.nodeId, target.nodeId, source.portIdx, target.portIdx);
      }
      setConnectionStart(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoom = e.deltaY > 0 ? 0.95 : 1.05;
      setScale(prev => Math.min(Math.max(prev * zoom, 0.1), 3));
    } else {
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const getNodePortPos = (nodeId: string, portIdx: number, type: 'in' | 'out') => {
    const node = workflow.nodes.find(n => n.node_id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    // 節點寬度固定為 240px (w-60)
    // 端點位於 top-11 (44px) 開始，每個 port 3x3 (12px 容器) + gap-2 (8px)
    // 中心 Y = node.y + 44 + (idx * 20) + 6
    return {
      x: node.position.x + (type === 'in' ? 0 : 240),
      y: node.position.y + 44 + (portIdx * 20) + 6
    };
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portIdx: number, type: 'in' | 'out') => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startMousePos = {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale
    };

    if (!connectionStart) {
      setConnectionStart({ nodeId, portIdx, type });
      setMousePos(startMousePos);
    } else {
      // 點擊連線模式 (Click A then Click B)
      if (connectionStart.type !== type && connectionStart.nodeId !== nodeId) {
        const source = connectionStart.type === 'out' ? connectionStart : { nodeId, portIdx, type };
        const target = connectionStart.type === 'in' ? connectionStart : { nodeId, portIdx, type };
        onConnect(source.nodeId, target.nodeId, source.portIdx, target.portIdx);
      }
      setConnectionStart(null);
    }
  };

  return (
    <div 
      ref={canvasRef}
      className="flex-1 relative bg-slate-900 overflow-hidden cursor-crosshair canvas-grid select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        className="absolute transition-transform duration-75 origin-top-left"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      >
        <svg className="absolute top-0 left-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
          
          {/* 現有連線 */}
          {workflow.edges.map(edge => {
            const start = getNodePortPos(edge.source, edge.sourcePortIndex, 'out');
            const end = getNodePortPos(edge.target, edge.targetPortIndex, 'in');
            const dist = Math.max(Math.abs(end.x - start.x) * 0.5, 40);
            const path = `M ${start.x} ${start.y} C ${start.x + dist} ${start.y}, ${end.x - dist} ${end.y}, ${end.x} ${end.y}`;
            return (
              <path 
                key={edge.id}
                d={path} 
                fill="none" 
                stroke="#475569" 
                strokeWidth="2.5" 
                markerEnd="url(#arrowhead)"
                className="drop-shadow-sm"
              />
            );
          })}

          {/* 正在建立的暫時連線 */}
          {connectionStart && (
            <path 
              d={`M ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).x} ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).y} C ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).x + (connectionStart.type === 'out' ? 50 : -50)} ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).y}, ${mousePos.x + (connectionStart.type === 'out' ? -50 : 50)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
              fill="none" 
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="6,4"
              className="animate-[dash_1s_linear_infinite]"
            />
          )}
        </svg>

        {/* 節點 */}
        {workflow.nodes.map(node => {
          const style = NODE_COLORS[node.node_type];
          const isSelected = selectedNodeId === node.node_id;

          return (
            <div
              key={node.node_id}
              onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
              className={`workflow-node absolute w-60 min-h-[90px] p-0 rounded-2xl border-2 cursor-default shadow-2xl transition-all duration-200 ${style.bg} ${style.border} ${isSelected ? 'ring-4 ring-white/30 scale-[1.02] z-20' : 'hover:scale-[1.01] hover:shadow-white/5 z-10'}`}
              style={{ left: node.position.x, top: node.position.y }}
            >
              <div 
                onMouseDown={(e) => handleNodeDragStart(e, node.node_id)}
                className="node-header flex items-center gap-2 p-3 bg-white/5 cursor-grab active:cursor-grabbing rounded-t-xl border-b border-white/5"
              >
                <span className={style.icon}>{NODE_ICONS[node.node_type]}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-1">{node.node_type}</span>
              </div>

              <div className="p-4">
                <h3 className="text-xs font-bold text-white leading-tight mb-1 truncate">{node.node_id}</h3>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed opacity-80">{node.description}</p>
              </div>
              
              {/* 輸入端點 (左側) */}
              <div className="absolute -left-2 top-11 flex flex-col gap-2">
                {node.inputs.map((input, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'in')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'in' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-4 h-4 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'in' ? 'border-blue-400 scale-125 bg-blue-900 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'border-slate-500'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-blue-300" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 pointer-events-none z-50">
                      {input || `Port ${idx}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* 輸出端點 (右側) */}
              <div className="absolute -right-2 top-11 flex flex-col gap-2">
                {node.outputs.map((output, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'out')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'out' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-4 h-4 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'out' ? 'border-emerald-400 scale-125 bg-emerald-900 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'border-slate-500'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-emerald-300" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] text-emerald-400 font-bold bg-slate-900/90 border border-emerald-900/30 px-2 py-0.5 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 pointer-events-none z-50">
                      {output || `Port ${idx}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 頂部工具列 */}
      <div className="toolbar absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40">
        {(Object.keys(NODE_ICONS) as NodeType[]).map((type) => (
          <button
            key={type}
            onClick={() => onAddNode(type)}
            title={`新增 ${type} 節點`}
            className="p-2.5 hover:bg-slate-700/80 rounded-xl text-slate-300 hover:text-white transition-all flex flex-col items-center gap-1.5 min-w-[64px] group"
          >
            <div className={`p-1.5 rounded-lg transition-colors ${NODE_COLORS[type].bg} group-hover:scale-110`}>
              {NODE_ICONS[type]}
            </div>
            <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">{type.replace('Agent', '')}</span>
          </button>
        ))}
        <div className="w-px h-10 bg-slate-700 mx-2" />
        <button 
          onClick={() => onAddNode(NodeType.AgentReasoning)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 active:scale-95"
        >
          <Plus size={16} />
          快速新增
        </button>
      </div>

      {/* 右下角縮放控制 */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-2 rounded-xl shadow-2xl">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors text-white font-bold">+</button>
        <span className="text-[10px] font-mono text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors text-white font-bold">-</button>
        <div className="w-px h-4 bg-slate-700 mx-2" />
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="text-[9px] px-3 py-1.5 hover:bg-slate-700 rounded-lg uppercase font-black text-slate-300 tracking-tighter">重置視圖</button>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>

      {!workflow.nodes.length && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-6 pointer-events-none">
          <div className="p-8 rounded-full bg-slate-800/30 border border-slate-700/30 animate-pulse">
            <Layers size={80} className="opacity-10" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold tracking-tight opacity-40">工作流畫布已就緒</p>
            <p className="text-sm opacity-20 max-w-xs">使用左側對話框生成流程，或點擊頂部按鈕手動構建您的 Agent 工作流</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;
