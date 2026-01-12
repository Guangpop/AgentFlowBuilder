
import React, { useState, useCallback } from 'react';
import { Workflow, WorkflowNode, Edge, NodeType } from './types';
import { generateWorkflow } from './services/gemini';
import ChatSidebar from './components/ChatSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';

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
  const [activeTab, setActiveTab] = useState<'canvas' | 'json'>('canvas');

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
    
    // 根據節點類型設定合理的初始端點數量
    let defaultInputs: string[] = ['輸入'];
    let defaultOutputs: string[] = ['輸出'];

    if (type === NodeType.UserInput) {
      defaultInputs = []; // 起始節點通常沒有輸入
    } else if (type === NodeType.AgentAction) {
      defaultOutputs = []; // 結束動作可能沒有輸出
    } else if (type === NodeType.Condition) {
      defaultOutputs = ['真 (True)', '假 (False)'];
    }

    const newNode: WorkflowNode = {
      node_id: id,
      node_type: type,
      description: '新建立的節點',
      inputs: defaultInputs,
      outputs: defaultOutputs,
      position: { x: 200, y: 200 },
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
      
      // 如果 node_id 改變了，需要更新相關的連線
      let newEdges = prev.edges;
      if (updates.node_id && updates.node_id !== nodeId) {
        newEdges = prev.edges.map(edge => ({
          ...edge,
          source: edge.source === nodeId ? updates.node_id! : edge.source,
          target: edge.target === nodeId ? updates.node_id! : edge.target
        }));
      }

      return {
        ...prev,
        nodes: newNodes,
        edges: newEdges
      };
    });
    
    if (updates.node_id) {
      setSelectedNodeId(updates.node_id);
    }
  }, []);

  const handleConnect = useCallback((source: string, target: string, sourcePort: number, targetPort: number) => {
    setWorkflow(prev => {
      // 避免重複連線
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

  const selectedNode = workflow.nodes.find(n => n.node_id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      <ChatSidebar 
        onGenerate={handleGenerate} 
        isLoading={isLoading} 
        confirmation={confirmation} 
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{workflow.name}</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono uppercase tracking-tighter">Edit Mode</span>
            </div>
            
            <nav className="flex items-center bg-slate-800 rounded-lg p-1">
              <button onClick={() => setActiveTab('canvas')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'canvas' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400'}`}>畫布視圖</button>
              <button onClick={() => setActiveTab('json')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'json' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400'}`}>工作流 JSON</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="bg-white hover:bg-slate-200 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-white/5 uppercase tracking-wider">
              儲存工作流
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden flex">
          {activeTab === 'canvas' ? (
            <WorkflowCanvas 
              workflow={workflow} 
              onNodeClick={handleNodeClick}
              onNodeMove={handleNodeMove}
              onConnect={handleConnect}
              onAddNode={handleAddNode}
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <div className="flex-1 bg-slate-950 p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <pre className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-blue-300 font-mono text-xs overflow-x-auto shadow-2xl leading-relaxed">
                  {JSON.stringify(workflow, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <NodeProperties 
              node={selectedNode} 
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleDeleteNode}
              onUpdate={(updates) => selectedNode && handleUpdateNode(selectedNode.node_id, updates)}
            />
          )}
        </div>

        <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span>互動式構建模式</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <span>節點數量: {workflow.nodes.length}</span>
            <span>連接數量: {workflow.edges.length}</span>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <span>DRAG TO MOVE • CLICK PORTS TO CONNECT</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
