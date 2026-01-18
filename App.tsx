import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Workflow, WorkflowNode, Edge, NodeType } from './types';
import { generateWorkflow, generateAgentInstructions } from './services/gemini';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ChatSidebar from './components/ChatSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';
import SettingsPanel from './components/SettingsPanel';
import {
  Share2,
  FileCode,
  Layout,
  FileText,
  Download,
  Upload,
  Zap,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  Terminal,
  Settings
} from 'lucide-react';

// Right panel mode
type RightPanelMode = 'none' | 'properties' | 'settings';

const AppContent: React.FC = () => {
  const { theme, themeId } = useTheme();

  const [workflow, setWorkflow] = useState<Workflow>({
    name: '未命名工作流',
    description: '點擊此處修改工作流描述...',
    nodes: [],
    edges: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [agentInstructions, setAgentInstructions] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'instructions' | 'mermaid' | 'markdown' | 'json'>('editor');
  const [copySuccess, setCopySuccess] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('none');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setConfirmation(null);
    try {
      const result = await generateWorkflow(prompt);
      setWorkflow({
        ...result.workflow,
        description: result.workflow.description || '由 AI 生成的工作流'
      });
      setConfirmation(result.confirmation);
      setSelectedNodeId(null);
      setAgentInstructions(null);
    } catch (err) {
      alert("生成工作流失敗，請檢查控制台。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInstructions = async () => {
    if (workflow.nodes.length === 0) return;
    setIsGeneratingInstructions(true);
    try {
      const result = await generateAgentInstructions(workflow);
      setAgentInstructions(result);
    } catch (err) {
      alert("生成指令集失敗。");
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNodeId(node.node_id);
    if (node.node_id) {
      setRightPanelMode('properties');
    }
  };

  const handleToggleSettings = () => {
    setRightPanelMode(prev => prev === 'settings' ? 'none' : 'settings');
    if (rightPanelMode !== 'settings') {
      setSelectedNodeId(null);
    }
  };

  const handleCloseRightPanel = () => {
    setRightPanelMode('none');
    setSelectedNodeId(null);
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
    let defaultConfig = undefined;

    if (type === NodeType.UserInput) {
      defaultInputs = [];
    } else if (type === NodeType.AgentAction) {
      defaultOutputs = [];
    } else if (type === NodeType.Condition) {
      defaultOutputs = ['真 (True)', '假 (False)'];
    } else if (type === NodeType.ScriptExecution) {
      defaultInputs = ['變數 Context'];
      defaultOutputs = ['執行結果 (Stdout)'];
      defaultConfig = { scriptType: 'python', scriptContent: '' };
    } else if (type === NodeType.MCPTool) {
      defaultInputs = ['工具參數'];
      defaultOutputs = ['工具回傳'];
      defaultConfig = { toolName: '' };
    } else if (type === NodeType.AgentSkill) {
      defaultInputs = ['前置依賴'];
      defaultOutputs = ['技能產出'];
      defaultConfig = { provider: '', skill: '' };
    }

    const newNode: WorkflowNode = {
      node_id: id,
      node_type: type,
      description: '請在此修改此節點的職責描述...',
      inputs: defaultInputs,
      outputs: defaultOutputs,
      position: { x: 400, y: 300 },
      next: [],
      config: defaultConfig
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

  const handleExport = () => {
    const jsonString = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name || 'workflow'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedWorkflow = JSON.parse(content) as Workflow;
        if (importedWorkflow.nodes && importedWorkflow.edges) {
          setWorkflow(importedWorkflow);
          setSelectedNodeId(null);
          setAgentInstructions(null);
        } else {
          alert('無效的工作流 JSON 檔案結構。');
        }
      } catch (err) {
        alert('導入失敗，請確保選擇的是正確的 JSON 檔案。');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const mermaidContent = useMemo(() => {
    let content = "graph TD\n";
    content += "  classDef UserInput fill:#1e3a8a,stroke:#3b82f6,color:#fff\n";
    content += "  classDef Reasoning fill:#4c1d95,stroke:#8b5cf6,color:#fff\n";
    content += "  classDef Condition fill:#7c2d12,stroke:#f97316,color:#fff\n";
    content += "  classDef Action fill:#064e3b,stroke:#10b981,color:#fff\n";

    workflow.nodes.forEach(node => {
      const safeId = node.node_id.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanName = node.node_id.replace(/[\[\]"()]/g, '');
      const cleanType = node.node_type.replace(/[\[\]"()]/g, '');
      content += `  ${safeId}["${cleanName} (${cleanType})"]\n`;
      
      if (node.node_type === NodeType.UserInput) content += `  class ${safeId} UserInput\n`;
      else if (node.node_type === NodeType.AgentReasoning) content += `  class ${safeId} Reasoning\n`;
      else if (node.node_type === NodeType.Condition) content += `  class ${safeId} Condition\n`;
      else if (node.node_type === NodeType.AgentAction) content += `  class ${safeId} Action\n`;
    });

    workflow.edges.forEach(edge => {
      const s = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
      const t = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
      if (edge.label) {
        const cleanLabel = edge.label.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '');
        content += `  ${s} -->|"${cleanLabel}"| ${t}\n`;
      } else {
        content += `  ${s} --> ${t}\n`;
      }
    });
    return content.trim();
  }, [workflow]);

  const mermaidChartUrl = useMemo(() => {
    try {
      const base64 = btoa(encodeURIComponent(mermaidContent).replace(/%([0-9A-F]{2})/g, (match, p1) => 
        String.fromCharCode(parseInt(p1, 16))
      ));
      return `https://mermaid.ink/img/${base64}`;
    } catch (e) {
      console.error("Mermaid base64 conversion error:", e);
      return "";
    }
  }, [mermaidContent]);

  const markdownContent = useMemo(() => {
    let md = `# 工作流: ${workflow.name}\n\n${workflow.description}\n\n## 節點清單\n\n`;
    workflow.nodes.forEach(node => {
      md += `### ${node.node_id} (${node.node_type})\n- **功能描述**: ${node.description}\n- **輸入端點**: ${node.inputs.join(', ') || '無'}\n- **輸出端點**: ${node.outputs.join(', ') || '無'}\n\n`;
    });
    md += `## 流程拓撲結構\n\n`;
    workflow.edges.forEach(edge => {
      md += `- ${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}\n`;
    });
    return md;
  }, [workflow]);

  const cleanJsonWorkflow = useMemo(() => {
    const nodesWithoutPosition = workflow.nodes.map(({ position, ...rest }) => rest);
    return {
      ...workflow,
      nodes: nodesWithoutPosition
    };
  }, [workflow]);

  const selectedNode = workflow.nodes.find(n => n.node_id === selectedNodeId) || null;

  const updateWorkflowMeta = (key: 'name' | 'description', value: string) => {
    setWorkflow(prev => ({ ...prev, [key]: value }));
  };

  const handleCopyInstructions = () => {
    if (agentInstructions) {
      navigator.clipboard.writeText(agentInstructions);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Determine background class based on theme
  const bgClass = theme.gradientBg || theme.bgPrimary;

  return (
    <div className={`flex h-screen w-screen ${bgClass} ${theme.textPrimary} selection:bg-blue-500/30 transition-colors duration-500`}>
      <ChatSidebar 
        onGenerate={handleGenerate} 
        isLoading={isLoading} 
        confirmation={confirmation} 
        workflowDescription={workflow.description}
        onUpdateDescription={(val) => updateWorkflowMeta('description', val)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className={`h-20 flex items-center justify-between px-8 border-b ${theme.borderColorLight} ${theme.headerBg} overflow-x-auto no-scrollbar shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col group relative">
              <input 
                type="text"
                value={workflow.name}
                onChange={(e) => updateWorkflowMeta('name', e.target.value)}
                className="bg-transparent border-none text-xl font-black text-white leading-none mb-1 tracking-tight focus:outline-none focus:ring-0 w-[240px]"
                placeholder="輸入工作流名稱"
              />
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-[0.2em] opacity-80 font-black">Workflow Editor v2.7</span>
            </div>
            
            <nav className="flex items-center bg-slate-800/80 rounded-[22px] p-1 shadow-inner border border-slate-700/50 shrink-0 ml-2">
              {[
                { id: 'editor', label: '畫布編輯器', icon: <Layout size={14}/> },
                { id: 'instructions', label: 'Agent 指令集', icon: <Zap size={14}/> },
                { id: 'mermaid', label: 'Mermaid', icon: <Share2 size={14}/> },
                { id: 'markdown', label: 'Markdown', icon: <FileText size={14}/> },
                { id: 'json', label: 'Raw JSON', icon: <FileCode size={14}/> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-[18px] text-[12px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-700 text-white shadow-lg ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleSettings}
              className={`p-2.5 ${theme.borderRadius} transition-all flex items-center justify-center active:scale-95 ${
                rightPanelMode === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} border ${theme.borderColor}`
              }`}
              title="設定"
            >
              <Settings size={18} />
            </button>
            <div className={`w-px h-8 ${theme.borderColor} opacity-50`} />
            <button
              onClick={handleImportClick}
              className={`${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary} px-4 py-2.5 ${theme.borderRadius} text-[12px] font-black transition-all ${theme.shadow} border ${theme.borderColor} flex items-center gap-2 active:scale-95`}
            >
              <Upload size={14} />
              Import
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              className="hidden"
              accept=".json"
            />
            <button
              onClick={handleExport}
              className={`${themeId === 'minimal' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white hover:bg-slate-200 text-slate-900'} px-4 py-2.5 ${theme.borderRadius} text-[12px] font-black transition-all shadow-2xl uppercase tracking-[0.1em] active:scale-95 flex items-center gap-2`}
            >
              <Download size={14} />
              Export
            </button>
          </div>
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
          ) : activeTab === 'instructions' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto flex flex-col items-center">
              <div className="max-w-5xl w-full space-y-10">
                <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                      <Zap className="text-yellow-400 fill-yellow-400" size={32} />
                      Agent Skill SOP 生成器
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                      基於「階層式揭露」原則，由 <span className="text-blue-400 font-bold">Gemini 3 Pro</span> 深度分析您的工作流，轉化為能夠防止 AI 注意力渙散的執行手冊。
                    </p>
                  </div>
                  <button 
                    disabled={workflow.nodes.length === 0 || isGeneratingInstructions}
                    onClick={handleGenerateInstructions}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-8 py-4 rounded-2xl text-[14px] font-black transition-all shadow-2xl flex items-center gap-3 active:scale-95 border border-blue-400/20"
                  >
                    {isGeneratingInstructions ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {agentInstructions ? "重新產生指令集" : "開始產生 Agent SOP"}
                  </button>
                </div>

                {agentInstructions ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {/* 使用提示區塊 */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-[32px] p-8 shadow-inner overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                          <Terminal size={120} className="text-blue-400" />
                       </div>
                       <h3 className="text-blue-400 font-black text-sm mb-4 flex items-center gap-2 uppercase tracking-widest">
                          <Info size={18} /> 使用建議
                       </h3>
                       <p className="text-slate-300 text-base mb-6 leading-relaxed max-w-3xl">
                          請將以下內容貼給 AI agent，讓他幫你產生 workflow 以及 Agent Skills：
                       </p>
                       <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 text-sm font-mono text-slate-400 select-all shadow-inner leading-relaxed">
                          <p>請你依照以下工作流程, 產生workflow指令, 以及相關的Agent skills</p>
                          <p className="my-2 opacity-30">---</p>
                          <p className="text-slate-600 italic">{"[ 在下方區塊複製產生的指令集並貼至此處 ]"}</p>
                       </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                      <div className="relative bg-slate-900/90 border border-slate-700 p-10 rounded-[40px] shadow-3xl">
                        <div className="flex justify-between items-center mb-8">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">GENERATED MASTER SYSTEM PROMPT</span>
                          <button 
                            onClick={handleCopyInstructions}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${copySuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700'}`}
                          >
                            {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            {copySuccess ? 'Copied' : 'Copy Prompt'}
                          </button>
                        </div>
                        <div className="prose prose-invert max-w-none">
                          <pre className="p-8 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 font-sans text-lg leading-relaxed whitespace-pre-wrap selection:bg-blue-500/40">
                            {agentInstructions}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { title: "階層式揭露", desc: "指令集將工作拆解為微型任務，避免單一 Prompt 過長導致的 Context 腐爛。" },
                         { title: "防汙染機制", desc: "明確定義 Skill 原子邊界，確保每個階段的狀態不會干擾後續邏輯。" },
                         { title: "反饋回圈優化", desc: "專門針對 Loop 節點優化執行路徑，確保 AI 能理解「返回上一步」的確切觸發點。" }
                       ].map((feat, idx) => (
                         <div key={idx} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50">
                            <h4 className="text-white font-black text-sm mb-2 tracking-tight">{feat.title}</h4>
                            <p className="text-slate-500 text-xs leading-relaxed">{feat.desc}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                ) : !isGeneratingInstructions ? (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-600 space-y-6 opacity-40">
                    <Zap size={64} className="animate-pulse" />
                    <p className="text-xl font-black uppercase tracking-widest text-center max-w-sm">
                      Ready to encode your workflow into agent intelligence
                    </p>
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                       <div className="w-24 h-24 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                       <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={32} />
                    </div>
                    <div className="text-center space-y-3">
                      <p className="text-2xl font-black text-blue-400 animate-pulse">正在構建 Skill SOP...</p>
                      <p className="text-slate-500 text-sm font-medium">Gemini 3 Pro 正在深度拆解工作流拓撲結構並處理狀態機邏輯</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'json' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <pre className="p-12 rounded-[48px] bg-slate-900 border border-slate-800 text-blue-300 font-mono text-[14px] overflow-x-auto shadow-[0_50px_150px_rgba(0,0,0,0.8)] leading-relaxed">
                  {JSON.stringify(cleanJsonWorkflow, null, 2)}
                </pre>
              </div>
            </div>
          ) : activeTab === 'mermaid' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto flex flex-col items-center">
              <div className="max-w-6xl w-full space-y-12">
                <div className="p-16 rounded-[60px] bg-slate-900/50 border border-slate-800 flex flex-col items-center gap-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                  <div className="bg-white p-12 rounded-[40px] shadow-inner max-w-full overflow-hidden border-[16px] border-slate-800/30 min-h-[300px] flex items-center justify-center">
                    {mermaidChartUrl ? (
                      <img src={mermaidChartUrl} alt="Workflow Diagram" className="max-w-full object-contain" />
                    ) : (
                      <div className="text-slate-400 font-bold italic">無法生成圖表，請檢查 DSL 定義</div>
                    )}
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
                      <button 
                        onClick={() => navigator.clipboard.writeText(markdownContent)}
                        className="text-[11px] font-black text-blue-400 hover:text-white transition-all uppercase tracking-[0.3em] border border-blue-500/20 px-8 py-4 rounded-3xl bg-blue-500/5 hover:bg-blue-600 shadow-xl"
                      >
                        Copy Markdown
                      </button>
                   </div>
                   <div className="whitespace-pre-wrap font-sans text-2xl leading-[2] opacity-90 font-medium">
                    {markdownContent}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'editor' && rightPanelMode === 'properties' && selectedNode && (
            <NodeProperties
              node={selectedNode}
              onClose={handleCloseRightPanel}
              onDelete={handleDeleteNode}
              onUpdate={(updates) => selectedNode && handleUpdateNode(selectedNode.node_id, updates)}
            />
          )}

          {rightPanelMode === 'settings' && (
            <SettingsPanel onClose={handleCloseRightPanel} />
          )}
        </div>

        <footer className={`h-16 ${theme.footerBg} border-t ${theme.borderColorLight} flex items-center justify-between px-10 text-[11px] font-black ${theme.textMuted} uppercase tracking-[0.3em] shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-pulse" />
              <span className={theme.textSecondary}>SYSTEM: ACTIVE</span>
            </div>
            <div className={`w-px h-6 ${theme.borderColor}`} />
            <div className="flex items-center gap-8 opacity-60">
              <span>NODES: {workflow.nodes.length}</span>
              <span>EDGES: {workflow.edges.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 opacity-40">
            <span>THEME: {theme.name.toUpperCase()}</span>
            <span>ENGINE: GEMINI-3-FLASH</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

// Wrap with ThemeProvider
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;