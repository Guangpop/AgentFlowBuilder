import React, { useRef, useState, useEffect } from 'react';
import { Workflow, WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS, NODE_DISPLAY_NAMES } from '../constants';
import { Layers, Plus, Trash2 } from 'lucide-react';

interface Props {
  workflow: Workflow;
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, position: { x: number, y: number }) => void;
  onConnect: (sourceId: string, targetId: string, sourceIdx: number, targetIdx: number) => void;
  onAddNode: (type: NodeType) => void;
  onDeleteEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  readonly?: boolean;
}

const WorkflowCanvas: React.FC<Props> = ({ 
  workflow, 
  onNodeClick, 
  onNodeMove, 
  onConnect, 
  onAddNode, 
  onDeleteEdge, 
  selectedNodeId,
  readonly = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, portIdx: number, type: 'in' | 'out' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string, portIdx: number, type: 'in' | 'out' } | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    if (readonly) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    setDraggedNodeId(nodeId);
    const node = workflow.nodes.find(n => n.node_id === nodeId);
    if (node) {
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

    if (!isNodeHeader) {
      if (!isPort) setConnectionStart(null);
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
    } else if (draggedNodeId && !readonly) {
      onNodeMove(draggedNodeId, {
        x: (e.clientX - offset.x - startPos.x) / scale,
        y: (e.clientY - offset.y - startPos.y) / scale
      });
    }

    if (connectionStart) {
      setMousePos(currentMouseCanvasPos);
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
    if (connectionStart && hoveredPort && !readonly) {
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
    return {
      x: node.position.x + (type === 'in' ? 0 : 320),
      y: node.position.y + 68 + (portIdx * 38) + 19
    };
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portIdx: number, type: 'in' | 'out') => {
    if (readonly) return;
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
      className={`flex-1 relative bg-slate-900 overflow-hidden canvas-grid select-none ${readonly ? '' : 'cursor-crosshair'}`}
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
            <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
          </defs>
          
          {workflow.edges.map(edge => {
            const start = getNodePortPos(edge.source, edge.sourcePortIndex, 'out');
            const end = getNodePortPos(edge.target, edge.targetPortIndex, 'in');
            const dist = Math.max(Math.abs(end.x - start.x) * 0.5, 120);
            const path = `M ${start.x} ${start.y} C ${start.x + dist} ${start.y}, ${end.x - dist} ${end.y}, ${end.x} ${end.y}`;
            const isHovered = hoveredEdgeId === edge.id;
            
            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer group">
                <path 
                  d={path} 
                  fill="none" 
                  stroke="transparent" 
                  strokeWidth="24" 
                  onMouseEnter={() => !readonly && setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  onClick={(e) => { e.stopPropagation(); if(!readonly) onDeleteEdge(edge.id); }}
                />
                <path 
                  d={path} 
                  fill="none" 
                  stroke={isHovered ? "#ef4444" : "#475569"} 
                  strokeWidth={isHovered ? "6" : "4"} 
                  markerEnd={isHovered ? "url(#arrowhead-hover)" : "url(#arrowhead)"}
                  className="transition-all duration-200"
                />
                {isHovered && !readonly && (
                   <g transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}>
                      <circle r="18" fill="#ef4444" className="shadow-2xl" />
                      <text textAnchor="middle" dy=".3em" fill="white" fontSize="18" fontWeight="900">×</text>
                   </g>
                )}
              </g>
            );
          })}

          {connectionStart && (
            <path 
              d={`M ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).x} ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).y} C ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).x + (connectionStart.type === 'out' ? 60 : -60)} ${getNodePortPos(connectionStart.nodeId, connectionStart.portIdx, connectionStart.type).y}, ${mousePos.x + (connectionStart.type === 'out' ? -60 : 60)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
              fill="none" 
              stroke="#3b82f6"
              strokeWidth="5"
              strokeDasharray="12,8"
              className="animate-[dash_1s_linear_infinite]"
            />
          )}
        </svg>

        {workflow.nodes.map(node => {
          const style = NODE_COLORS[node.node_type];
          const isSelected = selectedNodeId === node.node_id;

          return (
            <div
              key={node.node_id}
              onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
              className={`workflow-node absolute w-[320px] min-h-[180px] p-0 rounded-[40px] border-2 cursor-default shadow-2xl transition-all duration-300 ${style.bg} ${style.border} ${isSelected ? 'ring-[12px] ring-white/10 scale-[1.05] z-20 shadow-white/5' : 'hover:scale-[1.02] hover:shadow-white/10 z-10'}`}
              style={{ left: node.position.x, top: node.position.y }}
            >
              <div 
                onMouseDown={(e) => handleNodeDragStart(e, node.node_id)}
                className={`node-header flex items-center gap-5 p-6 bg-white/5 rounded-t-[38px] border-b border-white/5 ${readonly ? '' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div className={`p-3.5 rounded-2xl bg-white/10 shrink-0 shadow-lg ${style.icon}`}>
                  {NODE_ICONS[node.node_type]}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-black uppercase tracking-widest text-white leading-tight mb-1">
                    {NODE_DISPLAY_NAMES[node.node_type]}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 opacity-50 truncate">ID: {node.node_id}</span>
                </div>
              </div>

              <div className="p-8">
                <p className="text-[18px] font-semibold text-white leading-relaxed tracking-tight">
                  {node.description}
                </p>
              </div>
              
              <div className="absolute -left-4 top-16 flex flex-col gap-6">
                {node.inputs.map((input, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'in')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'in' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-8 h-8 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'in' ? 'border-blue-400 scale-125 bg-blue-900 shadow-[0_0_25px_rgba(96,165,250,0.8)]' : 'border-slate-500 hover:border-blue-400'}`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400 group-hover:bg-blue-300" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-200 font-bold bg-slate-900/95 px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 pointer-events-none z-50 border border-slate-700">
                      {input}
                    </span>
                  </div>
                ))}
              </div>

              <div className="absolute -right-4 top-16 flex flex-col gap-6">
                {node.outputs.map((output, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'out')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'out' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-8 h-8 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'out' ? 'border-emerald-400 scale-125 bg-emerald-900 shadow-[0_0_25px_rgba(52,211,153,0.8)]' : 'border-slate-500 hover:border-emerald-400'}`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400 group-hover:bg-emerald-300" />
                    <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-emerald-300 font-bold bg-slate-900/95 px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 pointer-events-none z-50 border border-emerald-900/40">
                      {output}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!readonly && (
        <div className="toolbar absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/95 backdrop-blur-3xl border border-slate-700/50 p-3.5 rounded-[32px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-40 overflow-visible max-w-[90vw] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 px-2 shrink-0">
            {(Object.keys(NODE_ICONS) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => onAddNode(type)}
                title={`新增 ${NODE_DISPLAY_NAMES[type]}`}
                className="p-3 hover:bg-slate-700/80 rounded-2xl text-slate-300 hover:text-white transition-all flex flex-col items-center gap-2 min-w-[100px] group shrink-0"
              >
                <div className={`p-2.5 rounded-xl transition-all ${NODE_COLORS[type].bg} group-hover:scale-110 shadow-lg`}>
                  {NODE_ICONS[type]}
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 text-center leading-none whitespace-nowrap">
                  {NODE_DISPLAY_NAMES[type].replace('用戶', '').replace('AI', '')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-12 left-12 flex items-center gap-6 bg-slate-800/90 backdrop-blur-3xl border border-slate-700 p-5 rounded-[32px] shadow-3xl">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-700 rounded-2xl transition-colors text-white text-2xl font-bold">+</button>
        <span className="text-sm font-mono text-slate-300 w-16 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="w-12 h-12 flex items-center justify-center hover:bg-slate-700 rounded-2xl transition-colors text-white text-2xl font-bold">-</button>
        <div className="w-px h-10 bg-slate-700 mx-3 opacity-30" />
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="text-[12px] px-8 py-3 hover:bg-slate-700 rounded-2xl uppercase font-black text-slate-300 tracking-[0.2em]">Reset View</button>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {!workflow.nodes.length && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-12 pointer-events-none">
          <div className="p-16 rounded-full bg-slate-800/20 border border-slate-700/20 animate-pulse">
            <Layers size={140} className="opacity-10" />
          </div>
          <div className="text-center space-y-6">
            <p className="text-4xl font-black tracking-tighter opacity-40">WORKSPACE READY</p>
            <p className="text-xl opacity-20 max-w-lg font-medium leading-relaxed">請在左側輸入您的 Agent 工作流構想，引擎將即時為您生成畫布。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;