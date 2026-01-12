
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Workflow, WorkflowNode, Edge, NodeType } from './types';
import { generateWorkflow } from './services/gemini';
import ChatSidebar from './components/ChatSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';
import { 
  Share2, 
  FileCode, 
  Layout, 
  FileText, 
  Square, 
  PenTool,
  Download
} from 'lucide-react';

const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '未命名工作流',
    description: '手動編輯模式已開啟',
    nodes: [],
    edges: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'canvas' | 'excalidraw' | 'mermaid' | 'markdown' | 'json'>('editor');

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setConfirmation(null);
    try {
      const result = await generateWorkflow(prompt);
      setWorkflow(result.workflow);
      setConfirmation(result.confirmation);
      setSelectedNodeId(null);
    } catch (err) {
      alert("生成工作流失敗，請檢查控制台。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNodeId(node.node_id);
  };

  const handleNodeMove = useCallback((nodeId: string, position: { x: number, y: number }) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.node_id === nodeId ? { ...n, position } : n)
    }));
  }, []);

  const handleAddNode = useCallback((type: NodeType) => {
    const id = `${type.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    let defaultInputs: string[] = ['輸入數據'];
    let defaultOutputs: string[] = ['輸出數據'];

    if (type === NodeType.UserInput) {
      defaultInputs = [];
    } else if (type === NodeType.AgentAction) {
      defaultOutputs = [];
    } else if (type === NodeType.Condition) {
      defaultOutputs = ['真 (True)', '假 (False)'];
    }

    const newNode: WorkflowNode = {
      node_id: id,
      node_type: type,
      description: '請在此點擊並修改此節點的具體職責描述...',
      inputs: defaultInputs,
      outputs: defaultOutputs,
      position: { x: 400, y: 300 },
      next: []
    };
    
    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(id);
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => {
      const newNodes = prev.nodes.map(n => n.node_id === nodeId ? { ...n, ...updates } : n);
      let newEdges = prev.edges;
      if (updates.node_id && updates.node_id !== nodeId) {
        newEdges = prev.edges.map(edge => ({
          ...edge,
          source: edge.source === nodeId ? updates.node_id! : edge.source,
          target: edge.target === nodeId ? updates.node_id! : edge.target
        }));
      }
      return { ...prev, nodes: newNodes, edges: newEdges };
    });
    if (updates.node_id) setSelectedNodeId(updates.node_id);
  }, []);

  const handleConnect = useCallback((source: string, target: string, sourcePort: number, targetPort: number) => {
    setWorkflow(prev => {
      const exists = prev.edges.some(e => 
        e.source === source && e.target === target && 
        e.sourcePortIndex === sourcePort && e.targetPortIndex === targetPort
      );
      if (exists) return prev;
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source,
        target,
        sourcePortIndex: sourcePort,
        targetPortIndex: targetPort
      };
      return {
        ...prev,
        edges: [...prev.edges, newEdge],
        nodes: prev.nodes.map(n => n.node_id === source ? { ...n, next: [...new Set([...n.next, target])] } : n)
      };
    });
  }, []);

  const handleDeleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.node_id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
    setSelectedNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId)
    }));
  };

  const obsidianCanvasContent = useMemo(() => {
    return {
      nodes: workflow.nodes.map(node => ({
        id: node.node_id,
        type: 'text',
        text: `### ${node.node_id}\n**類型**: ${node.node_type}\n\n${node.description}`,
        x: node.position.x,
        y: node.position.y,
        width: 320,
        height: 180
      })),
      edges: workflow.edges.map(edge => ({
        id: edge.id,
        fromNode: edge.source,
        toNode: edge.target,
        fromSide: 'right',
        toSide: 'left'
      }))
    };
  }, [workflow]);

  const mermaidContent = useMemo(() => {
    let content = "graph TD\n";
    workflow.nodes.forEach(node => {
      const safeId = node.node_id.replace(/[^a-zA-Z0-9]/g, '_');
      content += `  ${safeId}["<b>${node.node_id}</b><br/>(${node.node_type})"]\n`;
    });
    workflow.edges.forEach(edge => {
      const s = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
      const t = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
      content += `  ${s} --> ${t}\n`;
    });
    return content;
  }, [workflow]);

  const mermaidChartUrl = useMemo(() => {
    const base64 = btoa(unescape(encodeURIComponent(mermaidContent)));
    return `https://mermaid.ink/img/${base64}`;
  }, [mermaidContent]);

  const markdownContent = useMemo(() => {
    let md = `# 工作流: ${workflow.name}\n\n${workflow.description}\n\n## 節點清單\n\n`;
    workflow.nodes.forEach(node => {
      md += `### 🏢 ${node.node_id} (${node.node_type})\n- **功能描述**: ${node.description}\n- **輸入端點**: ${node.inputs.join(', ') || '無'}\n- **輸出端點**: ${node.outputs.join(', ') || '無'}\n\n`;
    });
    md += `## 流程拓撲結構\n\n`;
    workflow.edges.forEach(edge => {
      md += `- ${edge.source} ➔ ${edge.target}\n`;
    });
    return md;
  }, [workflow]);

  const selectedNode = workflow.nodes.find(n => n.node_id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      <ChatSidebar 
        onGenerate={handleGenerate} 
        isLoading={isLoading} 
        confirmation={confirmation} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col">
              <span className="text-xl font-black text-white leading-none mb-1 tracking-tight">{workflow.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-[0.2em] opacity-80 font-black">Workflow Core v2.5</span>
            </div>
            
            <nav className="flex items-center bg-slate-800/80 rounded-[22px] p-1.5 shadow-inner border border-slate-700/50 shrink-0 ml-4">
              {[
                { id: 'editor', label: '畫布編輯器', icon: <Layout size={16}/> },
                { id: 'canvas', label: 'Obsidian Canvas', icon: <Square size={16}/> },
                { id: 'excalidraw', label: 'Excalidraw JSON', icon: <PenTool size={16}/> },
                { id: 'mermaid', label: 'Mermaid', icon: <Share2 size={16}/> },
                { id: 'markdown', label: 'Markdown', icon: <FileText size={16}/> },
                { id: 'json', label: 'Raw JSON', icon: <FileCode size={16}/> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={`flex items-center gap-3 px-6 py-3 rounded-[18px] text-[14px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-700 text-white shadow-2xl scale-105 ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <button className="bg-white hover:bg-slate-200 text-slate-900 px-8 py-3 rounded-2xl text-[13px] font-black transition-all shadow-2xl shadow-white/5 uppercase tracking-[0.2em] active:scale-95 shrink-0 flex items-center gap-3">
            <Download size={16} />
            Export Flow
          </button>
        </header>

        <div className="flex-1 relative overflow-hidden flex">
          {activeTab === 'editor' ? (
            <WorkflowCanvas 
              workflow={workflow} 
              onNodeClick={handleNodeClick}
              onNodeMove={handleNodeMove}
              onConnect={handleConnect}
              onAddNode={handleAddNode}
              onDeleteEdge={handleDeleteEdge}
              selectedNodeId={selectedNodeId}
            />
          ) : activeTab === 'canvas' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto flex flex-col items-center gap-10">
              <div className="max-w-5xl w-full">
                <div className="mb-10 flex justify-between items-end border-b border-slate-800 pb-8">
                   <div>
                      <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Obsidian Canvas JSON</h3>
                      <p className="text-base text-slate-500 font-medium">請將下方代碼儲存為 <code className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">workflow.canvas</code> 以在 Obsidian 中載入。</p>
                   </div>
                   <button className="text-xs font-black text-blue-400 bg-blue-500/10 px-6 py-3 rounded-2xl border border-blue-500/20 hover:bg-blue-500/20 transition-all uppercase tracking-widest">Copy Canvas Data</button>
                </div>
                <pre className="p-12 rounded-[40px] bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-[13px] overflow-x-auto shadow-[0_40px_100px_rgba(0,0,0,0.8)] leading-relaxed">
                  {JSON.stringify(obsidianCanvasContent, null, 2)}
                </pre>
              </div>
            </div>
          ) : activeTab === 'excalidraw' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto flex flex-col items-center gap-10">
              <div className="max-w-6xl w-full">
                 <div className="mb-12 p-16 rounded-[60px] bg-white text-slate-900 shadow-[0_50px_150px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                       <PenTool size={200} />
                    </div>
                    <h2 className="text-4xl font-black mb-12 italic tracking-tight" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Excalidraw Sketch Preview</h2>
                    <div className="grid grid-cols-2 gap-12">
                       {workflow.nodes.map(node => (
                          <div key={node.node_id} className="p-8 border-[4px] border-slate-900 rounded-[32px] bg-slate-50 relative shadow-[10px_10px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] transition-all">
                             <div className="text-[11px] font-black uppercase mb-4 opacity-30 tracking-widest font-mono">NODE ID: {node.node_id}</div>
                             <div className="text-2xl font-black mb-5 tracking-tight">{node.node_type}</div>
                             <p className="text-[17px] font-medium opacity-90 leading-relaxed italic" style={{ fontFamily: '"Comic Sans MS", cursive' }}>"{node.description}"</p>
                             <div className="mt-8 flex flex-wrap gap-3">
                                {node.outputs.map((o, i) => (
                                   <span key={i} className="text-[11px] font-black px-4 py-1.5 border-2 border-slate-900 rounded-full bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">{o}</span>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>
                    {workflow.edges.length > 0 && (
                       <div className="mt-16 pt-12 border-t-[3px] border-dashed border-slate-200">
                          <h3 className="text-xs font-black opacity-30 uppercase tracking-[0.4em] mb-8 font-mono">TOPOLOGICAL CONNECTIONS</h3>
                          <div className="grid grid-cols-3 gap-6 font-mono text-sm font-bold text-slate-500">
                             {workflow.edges.map(e => (
                                <div key={e.id} className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                                   <span>{e.source} ➔ {e.target}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            </div>
          ) : activeTab === 'json' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <pre className="p-12 rounded-[48px] bg-slate-900 border border-slate-800 text-blue-300 font-mono text-[14px] overflow-x-auto shadow-[0_50px_150px_rgba(0,0,0,0.8)] leading-relaxed">
                  {JSON.stringify(workflow, null, 2)}
                </pre>
              </div>
            </div>
          ) : activeTab === 'mermaid' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto flex flex-col items-center">
              <div className="max-w-6xl w-full space-y-12">
                <div className="p-16 rounded-[60px] bg-slate-900/50 border border-slate-800 flex flex-col items-center gap-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                  <div className="bg-white p-12 rounded-[40px] shadow-inner max-w-full overflow-hidden border-[16px] border-slate-800/30">
                    <img src={mermaidChartUrl} alt="Workflow Diagram" className="max-w-full object-contain" />
                  </div>
                </div>
                <div className="p-12 rounded-[40px] bg-slate-900 border border-slate-800 shadow-2xl">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-8 tracking-[0.4em]">MERMAID DSL DEFINITION</h4>
                  <pre className="text-purple-300 font-mono text-[15px] overflow-x-auto leading-loose">
                    {mermaidContent}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto">
              <div className="max-w-5xl mx-auto">
                <div className="p-20 rounded-[80px] bg-slate-900 border border-slate-800 text-slate-200 shadow-[0_50px_150px_rgba(0,0,0,0.8)] space-y-12">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-10">
                      <h2 className="text-5xl font-black text-white tracking-tighter">系統設計文檔</h2>
                      <button className="text-[11px] font-black text-blue-400 hover:text-white transition-all uppercase tracking-[0.3em] border border-blue-500/20 px-8 py-4 rounded-3xl bg-blue-500/5 hover:bg-blue-600 shadow-xl">Copy Markdown</button>
                   </div>
                   <div className="whitespace-pre-wrap font-sans text-2xl leading-[2] opacity-90 font-medium">
                    {markdownContent}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <NodeProperties 
              node={selectedNode} 
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleDeleteNode}
              onUpdate={(updates) => selectedNode && handleUpdateNode(selectedNode.node_id, updates)}
            />
          )}
        </div>

        <footer className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-10 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] shrink-0">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-pulse" />
              <span className="text-slate-300">SYSTEM: ACTIVE</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-8 opacity-60">
              <span>NODES: {workflow.nodes.length}</span>
              <span>EDGES: {workflow.edges.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 opacity-40">
            <span>ENGINE: GEMINI-3-FLASH</span>
            <span>FORMAT: OBSIDIAN.CANVAS</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
