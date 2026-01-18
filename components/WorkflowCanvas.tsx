import React, { useRef, useState, useEffect } from 'react';
import { Workflow, WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS, NODE_DISPLAY_NAMES } from '../constants';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  workflow: Workflow;
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, position: { x: number, y: number }) => void;
  onConnect: (sourceId: string, targetId: string, sourceIdx: number, targetIdx: number) => void;
  onAddNode: (type: NodeType) => void;
  onDeleteEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  readonly?: boolean;
  hideToolbar?: boolean;
  hideZoomControls?: boolean;
}

const WorkflowCanvas: React.FC<Props> = ({
  workflow,
  onNodeClick,
  onNodeMove,
  onConnect,
  onAddNode,
  onDeleteEdge,
  selectedNodeId,
  readonly = false,
  hideToolbar = false,
  hideZoomControls = false
}) => {
  const { theme, themeId } = useTheme();
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
      x: node.position.x + (type === 'in' ? 0 : 240),
      y: node.position.y + 50 + (portIdx * 28) + 14
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

  // Generate grid style based on theme
  const gridStyle = {
    backgroundImage: `radial-gradient(circle, ${theme.canvasGrid} 1px, transparent 1px)`,
    backgroundSize: '20px 20px',
  };

  return (
    <div
      ref={canvasRef}
      className={`flex-1 relative ${theme.canvasBg} overflow-hidden select-none transition-colors duration-500 ${readonly ? '' : 'cursor-crosshair'}`}
      style={gridStyle}
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
              className={`workflow-node absolute w-[240px] min-h-[120px] p-0 rounded-2xl border cursor-default shadow-xl transition-all duration-300 ${style.bg} ${style.border} ${isSelected ? 'ring-4 ring-white/10 scale-[1.03] z-20' : 'hover:scale-[1.01] z-10'}`}
              style={{ left: node.position.x, top: node.position.y }}
            >
              <div
                onMouseDown={(e) => handleNodeDragStart(e, node.node_id)}
                className={`node-header flex items-center gap-3 px-4 py-3 bg-white/5 rounded-t-[14px] border-b border-white/5 ${readonly ? '' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div className={`p-2 rounded-lg bg-white/10 shrink-0 ${style.icon}`}>
                  {NODE_ICONS[node.node_type]}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-white leading-tight">
                    {NODE_DISPLAY_NAMES[node.node_type]}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 opacity-50 truncate">{node.node_id}</span>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-sm text-white/90 leading-relaxed line-clamp-3">
                  {node.description}
                </p>
              </div>

              <div className="absolute -left-3 top-12 flex flex-col gap-4">
                {node.inputs.map((input, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'in')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'in' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-6 h-6 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'in' ? 'border-blue-400 scale-125 bg-blue-900 shadow-[0_0_15px_rgba(96,165,250,0.7)]' : 'border-slate-500 hover:border-blue-400'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 group-hover:bg-blue-300" />
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-[10px] text-slate-200 font-medium bg-slate-900/95 px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border border-slate-700">
                      {input}
                    </span>
                  </div>
                ))}
              </div>

              <div className="absolute -right-3 top-12 flex flex-col gap-4">
                {node.outputs.map((output, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => handlePortMouseDown(e, node.node_id, idx, 'out')}
                    onMouseEnter={() => setHoveredPort({ nodeId: node.node_id, portIdx: idx, type: 'out' })}
                    onMouseLeave={() => setHoveredPort(null)}
                    className={`port w-6 h-6 rounded-full bg-slate-800 border-2 transition-all cursor-pointer group relative flex items-center justify-center ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'out' ? 'border-emerald-400 scale-125 bg-emerald-900 shadow-[0_0_15px_rgba(52,211,153,0.7)]' : 'border-slate-500 hover:border-emerald-400'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 group-hover:bg-emerald-300" />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-emerald-300 font-medium bg-slate-900/95 px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border border-emerald-900/40">
                      {output}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!readonly && !hideToolbar && (
        <div className={`toolbar absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 ${theme.bgTertiary} ${theme.blur} border ${theme.borderColor} p-2 ${theme.borderRadiusLg} ${theme.shadow} z-40 overflow-visible max-w-[90vw] overflow-x-auto no-scrollbar transition-colors duration-500`}>
          <div className="flex items-center gap-1 px-1 shrink-0">
            {(Object.keys(NODE_ICONS) as NodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => onAddNode(type)}
                title={`新增 ${NODE_DISPLAY_NAMES[type]}`}
                className={`p-2 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textSecondary} hover:${theme.textPrimary} transition-all flex flex-col items-center gap-1 min-w-[72px] group shrink-0`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${NODE_COLORS[type].bg} group-hover:scale-110`}>
                  {NODE_ICONS[type]}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 text-center leading-none whitespace-nowrap`}>
                  {NODE_DISPLAY_NAMES[type].replace('用戶', '').replace('AI', '')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!hideZoomControls && (
        <div className={`absolute bottom-6 left-6 flex items-center gap-2 ${theme.bgTertiary} ${theme.blur} border ${theme.borderColor} p-2 ${theme.borderRadiusLg} ${theme.shadow} transition-colors duration-500`}>
          <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className={`w-8 h-8 flex items-center justify-center ${theme.bgCardHover} ${theme.borderRadius} transition-colors ${theme.textPrimary} text-lg font-bold`}>+</button>
          <span className={`text-xs font-mono ${theme.textSecondary} w-12 text-center`}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className={`w-8 h-8 flex items-center justify-center ${theme.bgCardHover} ${theme.borderRadius} transition-colors ${theme.textPrimary} text-lg font-bold`}>-</button>
          <div className={`w-px h-6 ${theme.borderColor} mx-1 opacity-30`} />
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className={`text-[10px] px-3 py-1.5 ${theme.bgCardHover} ${theme.borderRadius} uppercase font-bold ${theme.textSecondary} tracking-wider`}>Reset</button>
        </div>
      )}

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
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${theme.textMuted} gap-6 pointer-events-none`}>
          <div className={`p-8 rounded-full ${theme.bgCard} border ${theme.borderColorLight} animate-pulse`}>
            <Layers size={64} className="opacity-10" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold tracking-tight opacity-40">WORKSPACE READY</p>
            <p className="text-sm opacity-20 max-w-sm leading-relaxed">在左側輸入工作流構想，引擎將即時生成畫布</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;