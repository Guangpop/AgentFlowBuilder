import React, { useRef, useState, useEffect } from 'react';
import { Workflow, WorkflowNode, NodeType } from '../types';
import { NODE_COLORS, NODE_ICONS, getNodeColors, NODE_CATEGORIES } from '../constants';
import { Layers, Plus, Trash2, MousePointer, ArrowRight, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  workflow: Workflow;
  onNodeClick: (node: WorkflowNode) => void;
  onNodeMove: (nodeId: string, position: { x: number, y: number }) => void;
  onConnect: (sourceId: string, targetId: string, sourceIdx: number, targetIdx: number) => void;
  onAddNode: (type: NodeType, position: { x: number; y: number }) => void;
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
  const { theme, themeId, t } = useTheme();

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

  // Helper to get short node name for toolbar
  const getNodeShortName = (type: NodeType): string => {
    const nameMap: Record<NodeType, string> = {
      [NodeType.UserInput]: t.nodeShortUserInput,
      [NodeType.AgentReasoning]: t.nodeShortAgentReasoning,
      [NodeType.Condition]: t.nodeShortCondition,
      [NodeType.AgentQuestion]: t.nodeShortAgentQuestion,
      [NodeType.UserResponse]: t.nodeShortUserResponse,
      [NodeType.AgentAction]: t.nodeShortAgentAction,
      [NodeType.ScriptExecution]: t.nodeShortScriptExecution,
      [NodeType.MCPTool]: t.nodeShortMCPTool,
      [NodeType.AgentSkill]: t.nodeShortAgentSkill,
    };
    return nameMap[type];
  };
  // Helper to get node tooltip description
  const getNodeDesc = (type: NodeType): string => {
    const descMap: Record<NodeType, string> = {
      [NodeType.UserInput]: (t as any).nodeDescUserInput || '',
      [NodeType.AgentReasoning]: (t as any).nodeDescAgentReasoning || '',
      [NodeType.Condition]: (t as any).nodeDescCondition || '',
      [NodeType.AgentQuestion]: (t as any).nodeDescAgentQuestion || '',
      [NodeType.UserResponse]: (t as any).nodeDescUserResponse || '',
      [NodeType.AgentAction]: (t as any).nodeDescAgentAction || '',
      [NodeType.ScriptExecution]: (t as any).nodeDescScriptExecution || '',
      [NodeType.MCPTool]: (t as any).nodeDescMCPTool || '',
      [NodeType.AgentSkill]: (t as any).nodeDescAgentSkill || '',
    };
    return descMap[type];
  };

  // Get category label from translations
  const getCategoryLabel = (labelKey: string): string => {
    return (t as any)[labelKey] || labelKey;
  };

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

  const isLightTheme = themeId === 'warm' || themeId === 'minimal';

  // Generate grid style based on theme
  const gridStyle = {
    backgroundImage: `radial-gradient(circle, ${theme.canvasGrid} 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
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
              <polygon points="0 0, 10 3.5, 0 7" fill={isLightTheme ? "#a8a29e" : "#64748b"} />
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
                  stroke={isHovered ? "#ef4444" : (isLightTheme ? "#a8a29e" : "#475569")}
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
          const nodeColors = getNodeColors(themeId);
          const style = nodeColors[node.node_type];
          const isSelected = selectedNodeId === node.node_id;
          const isLight = themeId === 'warm' || themeId === 'minimal';

          return (
            <div
              key={node.node_id}
              onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
              className={`workflow-node absolute w-[240px] min-h-[120px] p-0 rounded-2xl border cursor-default transition-all duration-300 ${style.bg} ${style.border} ${isLight ? 'shadow-md shadow-stone-200/60' : 'shadow-xl'} ${isSelected ? (isLight ? 'ring-4 ring-stone-300/40 scale-[1.03] z-20' : 'ring-4 ring-white/10 scale-[1.03] z-20') : 'hover:scale-[1.01] z-10'}`}
              style={{ left: node.position.x, top: node.position.y }}
            >
              <div
                onMouseDown={(e) => handleNodeDragStart(e, node.node_id)}
                className={`node-header flex items-center gap-3 px-4 py-3 ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'} rounded-t-[14px] border-b ${isLight ? 'border-black/5' : 'border-white/5'} ${readonly ? '' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-black/[0.05]' : 'bg-white/10'} shrink-0 ${style.icon}`}>
                  {NODE_ICONS[node.node_type]}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className={`text-xs font-bold uppercase tracking-wider leading-tight ${isLight ? 'text-stone-700' : 'text-white'}`}>
                    {getNodeDisplayName(node.node_type)}
                  </span>
                  <span className={`text-[9px] font-mono truncate ${isLight ? 'text-stone-400' : 'text-slate-500 opacity-50'}`}>{node.node_id}</span>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className={`text-sm leading-relaxed line-clamp-3 ${isLight ? 'text-stone-600' : 'text-white/90'}`}>
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
                    className={`port w-6 h-6 rounded-full border-2 transition-all cursor-pointer group relative flex items-center justify-center ${isLight ? 'bg-white' : 'bg-slate-800'} ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'in' ? (isLight ? 'border-blue-400 scale-125 bg-blue-50 shadow-md' : 'border-blue-400 scale-125 bg-blue-900 shadow-[0_0_15px_rgba(96,165,250,0.7)]') : (isLight ? 'border-stone-300 hover:border-blue-400' : 'border-slate-500 hover:border-blue-400')}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-stone-300 group-hover:bg-blue-400' : 'bg-slate-400 group-hover:bg-blue-300'}`} />
                    <span className={`absolute left-8 top-1/2 -translate-y-1/2 text-[10px] font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border ${isLight ? 'text-stone-700 bg-white border-stone-200' : 'text-slate-200 bg-slate-900/95 border-slate-700'}`}>
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
                    className={`port w-6 h-6 rounded-full border-2 transition-all cursor-pointer group relative flex items-center justify-center ${isLight ? 'bg-white' : 'bg-slate-800'} ${hoveredPort?.nodeId === node.node_id && hoveredPort?.portIdx === idx && hoveredPort?.type === 'out' ? (isLight ? 'border-emerald-400 scale-125 bg-emerald-50 shadow-md' : 'border-emerald-400 scale-125 bg-emerald-900 shadow-[0_0_15px_rgba(52,211,153,0.7)]') : (isLight ? 'border-stone-300 hover:border-emerald-400' : 'border-slate-500 hover:border-emerald-400')}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${isLight ? 'bg-stone-300 group-hover:bg-emerald-400' : 'bg-slate-400 group-hover:bg-emerald-300'}`} />
                    <span className={`absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 border ${isLight ? 'text-emerald-700 bg-white border-stone-200' : 'text-emerald-300 bg-slate-900/95 border-emerald-900/40'}`}>
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
        <div className={`toolbar absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 ${isLightTheme ? 'bg-white/95 border-stone-200 shadow-lg shadow-stone-200/40' : `${theme.bgTertiary} ${theme.blur} border-${theme.borderColor.replace('border-', '')}`} border p-3 rounded-2xl z-40 overflow-visible max-w-[90vw] overflow-x-auto no-scrollbar transition-colors duration-500`}>
          {NODE_CATEGORIES.map((cat, catIdx) => (
            <React.Fragment key={cat.labelKey}>
              {catIdx > 0 && <div className={`w-px h-8 ${isLightTheme ? 'bg-stone-300/40' : 'bg-white/10'} shrink-0`} />}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                  {getCategoryLabel(cat.labelKey)}
                </span>
                <div className="flex items-center gap-1">
                  {cat.types.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (rect) {
                          const centerX = (rect.width / 2 - offset.x) / scale;
                          const centerY = (rect.height / 2 - offset.y) / scale;
                          const jitter = () => (Math.random() - 0.5) * 60;
                          onAddNode(type, { x: centerX + jitter(), y: centerY + jitter() });
                        } else {
                          onAddNode(type, { x: 400, y: 300 });
                        }
                      }}
                      title={`${getNodeDisplayName(type)}\n${getNodeDesc(type)}`}
                      className={`p-2 ${theme.bgCardHover} rounded-xl ${theme.textSecondary} hover:${theme.textPrimary} transition-all duration-200 flex flex-col items-center gap-1 min-w-[56px] group shrink-0 cursor-pointer`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${getNodeColors(themeId)[type].bg} ${getNodeColors(themeId)[type].icon} group-hover:shadow-md`}>
                        {NODE_ICONS[type]}
                      </div>
                      <span className={`text-[10px] font-medium opacity-60 group-hover:opacity-100 text-center leading-none whitespace-nowrap transition-opacity duration-200`}>
                        {getNodeShortName(type)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))}
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
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-8 pointer-events-none`}>
          <div className="text-center space-y-3">
            <h2 className={`text-2xl font-bold tracking-tight ${isLightTheme ? 'text-stone-600' : theme.textPrimary}`}>
              {(t as any).welcomeTitle || t.workspaceReady}
            </h2>
            <p className={`text-base ${theme.textMuted} max-w-md leading-relaxed`}>
              {(t as any).welcomeSubtitle || t.workspaceHint}
            </p>
          </div>
          <div className={`flex items-center gap-6`}>
            {[
              { num: '1', icon: <MousePointer size={20} />, label: (t as any).welcomeStep1 || t.emptyStepAddNode, desc: (t as any).welcomeStep1Desc || '' },
              { num: '2', icon: <ArrowRight size={20} />, label: (t as any).welcomeStep2 || t.emptyStepConnect, desc: (t as any).welcomeStep2Desc || '' },
              { num: '3', icon: <Zap size={20} />, label: (t as any).welcomeStep3 || t.emptyStepGenerate, desc: (t as any).welcomeStep3Desc || '' },
            ].map((step, i) => (
              <div key={i} className={`flex flex-col items-center gap-3 px-6 py-5 ${isLightTheme ? 'bg-white border-stone-200 shadow-md shadow-stone-200/50' : `${theme.bgCard} border-${theme.borderColor.replace('border-', '')}`} border rounded-2xl w-[180px]`}>
                <div className={`w-7 h-7 rounded-full ${isLightTheme ? 'bg-teal-600' : 'bg-blue-600'} text-white text-xs font-bold flex items-center justify-center`}>
                  {step.num}
                </div>
                <div className={`${isLightTheme ? 'text-stone-500' : theme.textSecondary}`}>{step.icon}</div>
                <span className={`text-sm font-semibold ${theme.textPrimary} text-center`}>{step.label}</span>
                {step.desc && <span className={`text-[10px] ${theme.textMuted} text-center leading-relaxed`}>{step.desc}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                const centerX = (rect.width / 2 - offset.x) / scale;
                const centerY = (rect.height / 2 - offset.y) / scale;
                onAddNode(NodeType.UserInput, { x: centerX - 120, y: centerY - 60 });
              }
            }}
            className={`pointer-events-auto px-6 py-3 font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-md active:scale-[0.97] ${
              isLightTheme
                ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {(t as any).quickStart || 'Quick Start'}
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;