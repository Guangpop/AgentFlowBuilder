import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Workflow, WorkflowNode, Edge, NodeType } from './types';
import { getAIProvider, AI_PROVIDERS } from './services/ai';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { uiConfig } from './services';
import { zhTW, en } from './locales';
import ChatSidebar from './components/ChatSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';
import SettingsPanel from './components/SettingsPanel';
import LoginPage from './components/LoginPage';
import AuthCallback from './components/AuthCallback';
import AccountModal from './components/AccountModal';
import HistoryTab from './components/HistoryTab';
import InstantPaymentModal from './components/InstantPaymentModal';
import { isLocalMode } from './lib/mode';
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
  Settings,
  History
} from 'lucide-react';

// Right panel mode
type RightPanelMode = 'none' | 'properties' | 'settings';

// IDE and Output Type types
type IDEType = 'claude' | 'antigravity' | 'cursor';
type OutputTypeValue = 'skills' | 'commands' | 'workflows';

const AppContent: React.FC = () => {
  const { theme, themeId, t, language, apiStatus, setApiStatus, aiProvider } = useTheme();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [workflow, setWorkflow] = useState<Workflow>({
    name: t.defaultWorkflowName,
    description: '',
    nodes: [],
    edges: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [agentInstructions, setAgentInstructions] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'instructions' | 'mermaid' | 'markdown' | 'json' | 'history'>('editor');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyFullSuccess, setCopyFullSuccess] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('none');
  const [selectedIDE, setSelectedIDE] = useState<IDEType>('claude');
  const [selectedOutputType, setSelectedOutputType] = useState<OutputTypeValue>('skills');
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Payment flow states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'workflow' | 'sop' | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 當語言切換時，如果工作流名稱是預設值，則更新為新語言的預設值
  const defaultNames = [zhTW.defaultWorkflowName, en.defaultWorkflowName];
  useEffect(() => {
    setWorkflow(prev => {
      if (defaultNames.includes(prev.name)) {
        return { ...prev, name: t.defaultWorkflowName };
      }
      return prev;
    });
  }, [language, t.defaultWorkflowName]);

  const WORKFLOW_COST = 15; // TWD

  const handleGenerate = async (prompt: string) => {
    // In local mode, skip payment flow
    if (isLocalMode) {
      await executeWorkflowGeneration(prompt);
      return;
    }

    // In production mode, open payment modal first
    setPendingAction('workflow');
    setPendingPrompt(prompt);
    setPaymentAmount(WORKFLOW_COST);
    setPaymentDescription(t.paymentWorkflowDesc || '生成 Flow');
    setShowPaymentModal(true);
  };

  const executeWorkflowGeneration = async (prompt: string, prime?: string) => {
    setIsLoading(true);
    setConfirmation(null);
    try {
      const provider = getAIProvider(aiProvider);
      const result = await provider.generateWorkflow(prompt, language, prime);
      setWorkflow({
        ...result.workflow,
        description: result.workflow.description || t.aiGeneratedDescription
      });
      setConfirmation(result.confirmation);
      setSelectedNodeId(null);
      setAgentInstructions(null);
      setApiStatus('active'); // API call succeeded
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      // Only set inactive for real API failures, not business logic errors
      const isBusinessError = errMsg.includes('付款失敗') || errMsg.includes('Payment failed') || errMsg.includes('Too many requests');
      if (!isBusinessError) {
        setApiStatus('inactive');
      }
      alert(errMsg || t.alertGenerateFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const SOP_COST_PER_NODE = 15; // TWD per node

  const handleGenerateInstructions = async () => {
    if (workflow.nodes.length === 0) return;

    // In local mode, skip payment flow
    if (isLocalMode) {
      await executeInstructionsGeneration();
      return;
    }

    // In production mode, open payment modal first
    const totalCost = workflow.nodes.length * SOP_COST_PER_NODE;
    setPendingAction('sop');
    setPaymentAmount(totalCost);
    setPaymentDescription(t.paymentSopDesc ? t.paymentSopDesc(workflow.nodes.length) : `生成 SOP (${workflow.nodes.length} 節點)`);
    setShowPaymentModal(true);
  };

  const executeInstructionsGeneration = async (prime?: string) => {
    setIsGeneratingInstructions(true);
    try {
      const provider = getAIProvider(aiProvider);
      const result = await provider.generateAgentInstructions(workflow, language, prime);
      setAgentInstructions(result);
      setApiStatus('active'); // API call succeeded
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      // Only set inactive for real API failures, not business logic errors
      const isBusinessError = errMsg.includes('付款失敗') || errMsg.includes('Payment failed') || errMsg.includes('Too many requests');
      if (!isBusinessError) {
        setApiStatus('inactive');
      }
      alert(errMsg || t.alertInstructionsFailed);
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

  const handlePaymentSuccess = async (prime: string) => {
    setShowPaymentModal(false);

    if (pendingAction === 'workflow') {
      await executeWorkflowGeneration(pendingPrompt, prime);
    } else if (pendingAction === 'sop') {
      await executeInstructionsGeneration(prime);
    }

    // Reset pending states
    setPendingAction(null);
    setPendingPrompt('');
    setPaymentAmount(0);
    setPaymentDescription('');
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPendingAction(null);
    setPendingPrompt('');
    setPaymentAmount(0);
    setPaymentDescription('');
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
    let defaultInputs: string[] = [t.inputData];
    let defaultOutputs: string[] = [t.outputData];
    let defaultConfig = undefined;

    if (type === NodeType.UserInput) {
      defaultInputs = [];
    } else if (type === NodeType.AgentAction) {
      defaultOutputs = [];
    } else if (type === NodeType.Condition) {
      defaultOutputs = [t.trueOutput, t.falseOutput];
    } else if (type === NodeType.ScriptExecution) {
      defaultInputs = [t.variableContext];
      defaultOutputs = [t.executionResult];
      defaultConfig = { scriptType: 'python', scriptContent: '' };
    } else if (type === NodeType.MCPTool) {
      defaultInputs = [t.toolParams];
      defaultOutputs = [t.toolReturn];
      defaultConfig = { toolName: '' };
    } else if (type === NodeType.AgentSkill) {
      defaultInputs = [t.skillDependency];
      defaultOutputs = [t.skillOutput];
      defaultConfig = { provider: '', skill: '' };
    }

    const newNode: WorkflowNode = {
      node_id: id,
      node_type: type,
      description: '',
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
  }, [t]);

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
          alert(t.alertInvalidJson);
        }
      } catch (err) {
        alert(t.alertImportFailed);
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
    let md = `# ${t.workflow}: ${workflow.name}\n\n${workflow.description}\n\n## ${t.nodeList}\n\n`;
    workflow.nodes.forEach(node => {
      md += `### ${node.node_id} (${node.node_type})\n- **${t.functionDescLabel}**: ${node.description}\n- **${t.inputEndpoints}**: ${node.inputs.join(', ') || t.none}\n- **${t.outputEndpoints}**: ${node.outputs.join(', ') || t.none}\n\n`;
    });
    md += `## ${t.flowTopology}\n\n`;
    workflow.edges.forEach(edge => {
      md += `- ${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}\n`;
    });
    return md;
  }, [workflow, t]);

  const cleanJsonWorkflow = useMemo(() => {
    const nodesWithoutPosition = workflow.nodes.map(({ position, ...rest }) => rest);
    return {
      ...workflow,
      nodes: nodesWithoutPosition
    };
  }, [workflow]);

  // Handle auth callback - must be after all hooks
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Show login page if not authenticated (skip in local mode)
  if (uiConfig.showLoginPage && !authLoading && !user) {
    return <LoginPage />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.gradientBg || theme.bgPrimary}`}>
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

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

  // Get available output types based on selected IDE
  const getAvailableOutputTypes = (ide: IDEType): OutputTypeValue[] => {
    if (ide === 'antigravity') {
      return ['skills', 'workflows'];
    }
    return ['skills', 'commands'];
  };

  // Update output type when IDE changes
  const handleIDEChange = (ide: IDEType) => {
    setSelectedIDE(ide);
    const availableTypes = getAvailableOutputTypes(ide);
    if (!availableTypes.includes(selectedOutputType)) {
      setSelectedOutputType(availableTypes[0]);
    }
  };

  // Get file location based on IDE and output type
  const getFileLocation = (): string => {
    const locations: Record<IDEType, Record<OutputTypeValue, string>> = {
      claude: {
        skills: '.claude/skills/<skill-name>/SKILL.md',
        commands: '.claude/commands/<command-name>.md',
        workflows: ''
      },
      antigravity: {
        skills: '.agent/skills/<skill-name>/SKILL.md',
        commands: '',
        workflows: '.agent/workflows/<workflow-name>.md'
      },
      cursor: {
        skills: '.cursor/skills/<skill-name>/SKILL.md',
        commands: '.cursor/commands/<command-name>.md',
        workflows: ''
      }
    };
    return locations[selectedIDE][selectedOutputType] || '';
  };

  // Get prefix based on IDE and output type
  const getPrefix = (): string => {
    const prefixes: Record<IDEType, Record<OutputTypeValue, string>> = {
      claude: {
        skills: t.prefixClaudeSkills,
        commands: t.prefixClaudeCommands,
        workflows: ''
      },
      antigravity: {
        skills: t.prefixAntigravitySkills,
        commands: '',
        workflows: t.prefixAntigravityWorkflows
      },
      cursor: {
        skills: t.prefixCursorSkills,
        commands: t.prefixCursorCommands,
        workflows: ''
      }
    };
    return prefixes[selectedIDE][selectedOutputType] || '';
  };

  // Copy full prompt (prefix + agent instructions)
  const handleCopyFullPrompt = () => {
    if (agentInstructions) {
      const fullPrompt = getPrefix() + agentInstructions;
      navigator.clipboard.writeText(fullPrompt);
      setCopyFullSuccess(true);
      setTimeout(() => setCopyFullSuccess(false), 2000);
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
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className={`h-14 flex items-center justify-between px-6 border-b ${theme.borderColorLight} ${theme.headerBg} overflow-x-auto no-scrollbar shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 group">
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => updateWorkflowMeta('name', e.target.value)}
                className={`bg-transparent border-none text-base font-bold ${theme.textPrimary} leading-none tracking-tight focus:outline-none focus:ring-0 w-[160px]`}
                placeholder={t.workflowNamePlaceholder}
              />
              <span className={`text-xs ${theme.textMuted}`}>·</span>
              <input
                type="text"
                value={workflow.description}
                onChange={(e) => updateWorkflowMeta('description', e.target.value)}
                className={`bg-transparent border-none text-xs ${theme.textSecondary} leading-none focus:outline-none focus:ring-0 w-[200px] truncate`}
                placeholder={t.descriptionPlaceholder}
              />
            </div>

            <nav className={`flex items-center ${theme.bgTertiary} rounded-lg p-0.5 border ${theme.borderColor} shrink-0 ml-3`}>
              {[
                { id: 'editor', label: t.tabCanvas, icon: <Layout size={12}/> },
                { id: 'instructions', label: t.tabInstructions, icon: <Zap size={12}/> },
                { id: 'mermaid', label: t.tabMermaid, icon: <Share2 size={12}/> },
                { id: 'markdown', label: t.tabMarkdown, icon: <FileText size={12}/> },
                { id: 'json', label: t.tabJson, icon: <FileCode size={12}/> },
                { id: 'history', label: t.tabHistory, icon: <History size={12}/> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? `${theme.bgCard} ${theme.textPrimary} shadow-sm` : `${theme.textMuted} hover:${theme.textSecondary}`}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Account Button - Hidden in local mode */}
            {uiConfig.showAccountButton && (
              <button
                onClick={() => setShowAccountModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColor} hover:border-blue-500/50 transition-all`}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" aria-hidden="true" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className={`w-6 h-6 rounded-full ${theme.bgCard} flex items-center justify-center`}>
                    <span className="text-xs font-bold">{profile?.email?.[0]?.toUpperCase()}</span>
                  </div>
                )}
              </button>
            )}
            <button
              onClick={handleToggleSettings}
              className={`p-2 ${theme.borderRadius} transition-all flex items-center justify-center active:scale-95 ${
                rightPanelMode === 'settings'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} border ${theme.borderColor}`
              }`}
              title={t.settings}
            >
              <Settings size={14} />
            </button>
            <div className={`w-px h-6 ${theme.borderColor} opacity-50`} />
            <button
              onClick={handleImportClick}
              className={`${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary} px-3 py-1.5 ${theme.borderRadius} text-[10px] font-bold transition-all border ${theme.borderColor} flex items-center gap-1.5 active:scale-95`}
            >
              <Upload size={12} />
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
              className={`${themeId === 'minimal' ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white hover:bg-slate-200 text-slate-900'} px-3 py-1.5 ${theme.borderRadius} text-[10px] font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5`}
            >
              <Download size={12} />
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
                      {t.instructionsTitle}
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl font-medium leading-relaxed">
                      {t.instructionsDescription}
                    </p>
                  </div>
                  <button
                    disabled={workflow.nodes.length === 0 || isGeneratingInstructions}
                    onClick={handleGenerateInstructions}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-8 py-4 rounded-2xl text-[14px] font-black transition-all shadow-2xl flex items-center gap-3 active:scale-95 border border-blue-400/20"
                  >
                    {isGeneratingInstructions ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {agentInstructions ? t.regenerateInstructions : t.generateInstructions}
                  </button>
                </div>

                {agentInstructions ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {/* IDE/Type Selector Section */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-[32px] p-8 shadow-inner overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                          <Terminal size={120} className="text-blue-400" />
                       </div>
                       <h3 className="text-blue-400 font-black text-sm mb-6 flex items-center gap-2 uppercase tracking-widest">
                          <Info size={18} /> {t.usageSuggestion}
                       </h3>

                       {/* IDE and Type Selectors */}
                       <div className="flex flex-wrap gap-6 mb-6">
                         {/* IDE Selector */}
                         <div className="flex flex-col gap-2">
                           <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.ideLabel}</label>
                           <div className="flex gap-2">
                             {(['claude', 'antigravity', 'cursor'] as IDEType[]).map(ide => (
                               <button
                                 key={ide}
                                 onClick={() => handleIDEChange(ide)}
                                 className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                   selectedIDE === ide
                                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                     : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'
                                 }`}
                               >
                                 {ide === 'claude' ? t.ideClaudeCode : ide === 'antigravity' ? t.ideAntigravity : t.ideCursor}
                               </button>
                             ))}
                           </div>
                         </div>

                         {/* Output Type Selector */}
                         <div className="flex flex-col gap-2">
                           <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.outputTypeLabel}</label>
                           <div className="flex gap-2">
                             {getAvailableOutputTypes(selectedIDE).map(type => (
                               <button
                                 key={type}
                                 onClick={() => setSelectedOutputType(type)}
                                 className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                   selectedOutputType === type
                                     ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                     : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-slate-700'
                                 }`}
                               >
                                 {type === 'skills' ? t.outputTypeSkills : type === 'commands' ? t.outputTypeCommands : t.outputTypeWorkflows}
                               </button>
                             ))}
                           </div>
                         </div>
                       </div>

                       {/* File Location */}
                       <div className="mb-6">
                         <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.fileLocationLabel}</label>
                         <div className="mt-2 bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-sm font-mono text-cyan-400">
                           {getFileLocation()}
                         </div>
                       </div>

                       {/* Prefix Display */}
                       <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 text-sm font-mono text-slate-400 shadow-inner leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                         {getPrefix()}
                       </div>

                       {/* Copy Full Prompt Button */}
                       <div className="mt-6 flex justify-end">
                         <button
                           onClick={handleCopyFullPrompt}
                           className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${
                             copyFullSuccess
                               ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                               : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                           }`}
                         >
                           {copyFullSuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                           {copyFullSuccess ? t.copiedFull : t.copyFullPrompt}
                         </button>
                       </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                      <div className="relative bg-slate-900/90 border border-slate-700 p-10 rounded-[40px] shadow-3xl">
                        <div className="flex justify-between items-center mb-8">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{t.generatedPrompt}</span>
                          <button
                            onClick={handleCopyInstructions}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${copySuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700'}`}
                          >
                            {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            {copySuccess ? t.copied : t.copyPrompt}
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
                         { title: t.featureHierarchical, desc: t.featureHierarchicalDesc },
                         { title: t.featureAntiPollution, desc: t.featureAntiPollutionDesc },
                         { title: t.featureFeedbackLoop, desc: t.featureFeedbackLoopDesc }
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
                      {t.readyToEncode}
                    </p>
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                       <div className="w-24 h-24 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                       <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={32} />
                    </div>
                    <div className="text-center space-y-3">
                      <p className="text-2xl font-black text-blue-400 animate-pulse">{t.generatingInstructions}</p>
                      <p className="text-slate-500 text-sm font-medium">{t.generatingSubtext}</p>
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
                      <div className="text-slate-400 font-bold italic">{t.cannotGenerateChart}</div>
                    )}
                  </div>
                </div>
                <div className="p-12 rounded-[40px] bg-slate-900 border border-slate-800 shadow-2xl">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-8 tracking-[0.4em]">{t.mermaidDslDef}</h4>
                  <pre className="text-purple-300 font-mono text-[15px] overflow-x-auto leading-loose">
                    {mermaidContent}
                  </pre>
                </div>
              </div>
            </div>
          ) : activeTab === 'markdown' ? (
            <div className="flex-1 bg-slate-950 p-12 overflow-auto">
              <div className="max-w-5xl mx-auto">
                <div className="p-20 rounded-[80px] bg-slate-900 border border-slate-800 text-slate-200 shadow-[0_50px_150px_rgba(0,0,0,0.8)] space-y-12">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-10">
                      <h2 className="text-5xl font-black text-white tracking-tighter">{t.systemDesignDoc}</h2>
                      <button
                        onClick={() => navigator.clipboard.writeText(markdownContent)}
                        className="text-[11px] font-black text-blue-400 hover:text-white transition-all uppercase tracking-[0.3em] border border-blue-500/20 px-8 py-4 rounded-3xl bg-blue-500/5 hover:bg-blue-600 shadow-xl"
                      >
                        {t.copyMarkdown}
                      </button>
                   </div>
                   <div className="whitespace-pre-wrap font-sans text-2xl leading-[2] opacity-90 font-medium">
                    {markdownContent}
                   </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <HistoryTab />
          ) : null}

          {activeTab === 'editor' && rightPanelMode === 'properties' && selectedNode && (
            <NodeProperties
              node={selectedNode}
              allNodeIds={workflow.nodes.map(n => n.node_id)}
              onClose={handleCloseRightPanel}
              onDelete={handleDeleteNode}
              onUpdate={(updates) => selectedNode && handleUpdateNode(selectedNode.node_id, updates)}
            />
          )}

          {rightPanelMode === 'settings' && (
            <SettingsPanel onClose={handleCloseRightPanel} />
          )}
        </div>

        <footer className={`h-10 ${theme.footerBg} border-t ${theme.borderColorLight} flex items-center justify-between px-6 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors duration-500`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${apiStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'} ${apiStatus === 'active' ? 'animate-pulse' : ''}`} />
              <span className={apiStatus === 'active' ? 'text-emerald-400' : 'text-red-400'}>
                {apiStatus === 'active' ? t.active : t.inactive}
              </span>
            </div>
            <div className={`w-px h-4 ${theme.borderColor}`} />
            <div className={`flex items-center gap-4 ${themeId === 'minimal' ? 'text-slate-500' : 'text-slate-300'}`}>
              <span>{t.nodes}: {workflow.nodes.length}</span>
              <span>{t.edges}: {workflow.edges.length}</span>
            </div>
          </div>
          <div className={`flex items-center gap-4 ${themeId === 'minimal' ? 'text-slate-400' : 'text-slate-400'}`}>
            <span>{AI_PROVIDERS[aiProvider].modelName}</span>
          </div>
        </footer>
      </main>

      {showAccountModal && (
        <AccountModal onClose={() => setShowAccountModal(false)} />
      )}

      {showPaymentModal && (
        <InstantPaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          onPaymentSuccess={handlePaymentSuccess}
          amount={paymentAmount}
          description={paymentDescription}
        />
      )}
    </div>
  );
};

// Wrap with ThemeProvider and AuthProvider
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;