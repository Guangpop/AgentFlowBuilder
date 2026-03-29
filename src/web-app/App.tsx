import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Workflow, WorkflowNode, NodeType, Edge } from './types';
import { NODE_COLORS } from './constants';
import { generateMermaid, generateMarkdown, cleanWorkflowForExport } from '@shared/export';
import { useTheme } from './contexts/ThemeContext';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';
import ChatSidebar from './components/ChatSidebar';
import SettingsPanel from './components/SettingsPanel';
import InstructionsTab from './components/InstructionsTab';
import MermaidPreview from './components/MermaidPreview';
import { Settings, Copy, Download, Check, Code, Eye, LayoutGrid, Sparkles, FileCode, FileText, Braces } from 'lucide-react';
import type { LocaleStrings } from './locales';
import { ToastProvider, useToast } from './contexts/ToastContext';
import WelcomeModal, { useWelcomeModal } from './components/WelcomeModal';

const defaultWorkflow: Workflow = {
  name: 'New Workflow',
  description: '',
  nodes: [],
  edges: [],
};

function rebuildEdges(nodes: WorkflowNode[], t: LocaleStrings): Edge[] {
  const edges: Edge[] = [];
  const nodeIds = new Set(nodes.map(n => n.node_id));
  nodes.forEach(node => {
    node.next.forEach((targetId, index) => {
      if (nodeIds.has(targetId)) {
        edges.push({
          id: `edge-${node.node_id}-${targetId}-${index}`,
          source: node.node_id,
          target: targetId,
          sourcePortIndex: index,
          targetPortIndex: 0,
          label: node.node_type === NodeType.Condition
            ? (index === 0 ? t.trueOutput : t.falseOutput)
            : '',
        });
      }
    });
  });
  return edges;
}

const AppInner: React.FC = () => {
  const { theme, themeId, t } = useTheme();
  const { showToast } = useToast();
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeModal();

  const [workflow, setWorkflow] = useState<Workflow>(defaultWorkflow);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'instructions' | 'mermaid' | 'markdown' | 'json'>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showMermaidCode, setShowMermaidCode] = useState(false);

  const sseRef = useRef<EventSource | null>(null);

  // SSE: watch for file changes
  useEffect(() => {
    const es = new EventSource('/api/watch');
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Refresh the sidebar list on any file change
        setRefreshKey(prev => prev + 1);
        // Auto-reload if the changed file matches current workflow
        if (currentWorkflowName && data.name === currentWorkflowName && data.event !== 'unlink') {
          handleLoad(currentWorkflowName);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => {
      es.close();
    };
  }, [currentWorkflowName]);

  // Mark unsaved on workflow change
  const updateWorkflow = useCallback((updater: (prev: Workflow) => Workflow) => {
    setWorkflow(prev => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  }, []);

  // ─── Node operations ───

  const handleNodeClick = useCallback((node: WorkflowNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    updateWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.node_id === nodeId ? { ...n, position } : n),
    }));
  }, [updateWorkflow]);

  const handleAddNode = useCallback((type: NodeType, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      node_id: `${type.toLowerCase()}_${Date.now()}`,
      node_type: type,
      description: '',
      inputs: ['input'],
      outputs: type === NodeType.Condition ? ['true_output', 'false_output'] : ['output'],
      next: [],
      position,
    };
    updateWorkflow(prev => {
      const nodes = [...prev.nodes, newNode];
      return { ...prev, nodes, edges: rebuildEdges(nodes, t) };
    });
  }, [updateWorkflow, t]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    updateWorkflow(prev => {
      const nodes = prev.nodes
        .filter(n => n.node_id !== nodeId)
        .map(n => ({ ...n, next: n.next.filter(id => id !== nodeId) }));
      return { ...prev, nodes, edges: rebuildEdges(nodes, t) };
    });
    setSelectedNode(prev => prev?.node_id === nodeId ? null : prev);
  }, [updateWorkflow, t]);

  const handleUpdateNode = useCallback((updates: Partial<WorkflowNode>) => {
    if (!selectedNode) return;
    const oldId = selectedNode.node_id;
    const newId = updates.node_id;

    updateWorkflow(prev => {
      let nodes = prev.nodes.map(n => {
        if (n.node_id === oldId) {
          return { ...n, ...updates };
        }
        // If node_id changed, update references in other nodes' next arrays
        if (newId && newId !== oldId) {
          return { ...n, next: n.next.map(id => id === oldId ? newId : id) };
        }
        return n;
      });
      return { ...prev, nodes, edges: rebuildEdges(nodes, t) };
    });

    setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
  }, [selectedNode, updateWorkflow, t]);

  const handleConnect = useCallback((sourceId: string, targetId: string, sourceIdx: number, _targetIdx: number) => {
    updateWorkflow(prev => {
      const nodes = prev.nodes.map(n => {
        if (n.node_id === sourceId) {
          const next = [...n.next];
          // For condition nodes, set at specific index; otherwise append
          if (n.node_type === NodeType.Condition) {
            next[sourceIdx] = targetId;
          } else {
            if (!next.includes(targetId)) {
              next.push(targetId);
            }
          }
          return { ...n, next };
        }
        return n;
      });
      return { ...prev, nodes, edges: rebuildEdges(nodes, t) };
    });
  }, [updateWorkflow, t]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    updateWorkflow(prev => {
      // Find the edge to determine source and target
      const edge = prev.edges.find(e => e.id === edgeId);
      if (!edge) return prev;
      const nodes = prev.nodes.map(n => {
        if (n.node_id === edge.source) {
          const next = [...n.next];
          // Remove the specific occurrence at the port index
          if (n.node_type === NodeType.Condition) {
            next[edge.sourcePortIndex] = '';
          } else {
            const idx = next.indexOf(edge.target);
            if (idx !== -1) next.splice(idx, 1);
          }
          return { ...n, next: next.filter(id => id !== '') };
        }
        return n;
      });
      return { ...prev, nodes, edges: rebuildEdges(nodes, t) };
    });
  }, [updateWorkflow, t]);

  // ─── File operations ───

  const handleSave = useCallback(async () => {
    const name = currentWorkflowName || workflow.name;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, workflow }),
      });
      if (res.ok) {
        setCurrentWorkflowName(name);
        setHasUnsavedChanges(false);
        setRefreshKey(prev => prev + 1);
        showToast((t as any).savedToast || 'Workflow saved', 'success');
      }
    } catch (err) {
      console.error('Failed to save workflow:', err);
      showToast('Save failed', 'error');
    }
  }, [currentWorkflowName, workflow, showToast, t]);

  const handleLoad = useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/load/${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data.workflow);
        setCurrentWorkflowName(name);
        setHasUnsavedChanges(false);
        setSelectedNode(null);
        setActiveTab('editor');
      }
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  }, []);

  const handleNew = useCallback(() => {
    setWorkflow({ ...defaultWorkflow });
    setCurrentWorkflowName(null);
    setHasUnsavedChanges(false);
    setSelectedNode(null);
    setActiveTab('editor');
  }, []);

  const handleImportWorkflow = useCallback((workflowData: any, name: string) => {
    const imported: Workflow = {
      name: workflowData.name || name,
      description: workflowData.description || '',
      nodes: workflowData.nodes || [],
      edges: [],
    };
    imported.edges = rebuildEdges(imported.nodes, t);
    setWorkflow(imported);
    setCurrentWorkflowName(name);
    setHasUnsavedChanges(true);
    setSelectedNode(null);
    setActiveTab('editor');
  }, [t]);

  // ─── Export helpers ───

  const handleDownloadJson = useCallback(() => {
    const data = JSON.stringify(cleanWorkflowForExport(workflow), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflow]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast((t as any).copiedToast || 'Copied to clipboard', 'success');
  }, [showToast, t]);

  // ─── Tab content ───

  const markdownLabels = {
    workflow: t.workflow,
    nodeList: t.nodeList,
    functionDescLabel: t.functionDescLabel,
    inputEndpoints: t.inputEndpoints,
    outputEndpoints: t.outputEndpoints,
    none: t.none,
    flowTopology: t.flowTopology,
  };

  const renderTabContent = () => {
    if (activeTab === 'editor') return null; // Canvas is rendered separately
    if (activeTab === 'instructions') {
      return <InstructionsTab workflow={workflow} workflowName={currentWorkflowName} />;
    }

    // Mermaid tab: visual diagram + code toggle
    if (activeTab === 'mermaid') {
      const mermaidCode = generateMermaid(workflow);
      return (
        <div className={`flex-1 flex flex-col ${theme.bgPrimary} overflow-hidden`}>
          <div className={`flex items-center justify-between px-4 py-2 border-b ${theme.borderColorLight}`}>
            <span className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>{t.mermaidDslDef}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMermaidCode(!showMermaidCode)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
              >
                {showMermaidCode ? <Eye size={12} /> : <Code size={12} />}
                {showMermaidCode ? 'Diagram' : 'Code'}
              </button>
              <button
                onClick={() => handleCopy(mermaidCode)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t.copied : 'Copy Mermaid'}
              </button>
            </div>
          </div>
          {showMermaidCode ? (
            <pre className={`flex-1 overflow-auto p-4 text-xs ${theme.textSecondary} font-mono leading-relaxed whitespace-pre-wrap`}>
              {mermaidCode}
            </pre>
          ) : (
            <div className="flex-1 overflow-auto">
              <MermaidPreview code={mermaidCode} />
            </div>
          )}
        </div>
      );
    }

    // Markdown / JSON tabs
    let content = '';
    let title = '';
    let copyLabel = '';

    switch (activeTab) {
      case 'markdown':
        content = generateMarkdown(workflow, markdownLabels);
        title = t.systemDesignDoc;
        copyLabel = t.copyMarkdown;
        break;
      case 'json':
        content = JSON.stringify(cleanWorkflowForExport(workflow), null, 2);
        title = 'JSON';
        copyLabel = 'Copy JSON';
        break;
    }

    return (
      <div className={`flex-1 flex flex-col ${theme.bgPrimary} overflow-hidden`}>
        <div className={`flex items-center justify-between px-4 py-2 border-b ${theme.borderColorLight}`}>
          <span className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>{title}</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(content)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t.copied : copyLabel}
            </button>
            {activeTab === 'json' && (
              <button
                onClick={handleDownloadJson}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
              >
                <Download size={12} />
                Download
              </button>
            )}
          </div>
        </div>
        <pre className={`flex-1 overflow-auto p-4 text-xs ${theme.textSecondary} font-mono leading-relaxed whitespace-pre-wrap`}>
          {content}
        </pre>
      </div>
    );
  };

  // ─── Layout ───

  const mainTabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: 'editor', label: t.tabCanvas, icon: <LayoutGrid size={14} /> },
    { key: 'instructions', label: t.tabInstructions, icon: <Sparkles size={14} /> },
  ];

  const exportTabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: 'mermaid', label: t.tabMermaid, icon: <FileCode size={12} /> },
    { key: 'markdown', label: t.tabMarkdown, icon: <FileText size={12} /> },
    { key: 'json', label: t.tabJson, icon: <Braces size={12} /> },
  ];

  const isLightTheme = themeId === 'warm' || themeId === 'minimal';

  return (
    <div className={`h-screen flex flex-col ${theme.bgPrimary} transition-colors duration-500`}>
      {/* Tab bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b ${theme.borderColorLight} ${theme.sidebarBg}`}>
        {/* Left: Logo + Workflow name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className={`text-sm font-bold ${theme.textPrimary} hidden sm:block`}>AgentFlow</span>
          </div>
          {currentWorkflowName && (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${theme.textMuted}`}>/</span>
              <span className={`text-xs font-medium ${theme.textSecondary} font-mono`}>
                {currentWorkflowName}
              </span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </div>
          )}
        </div>

        {/* Center: Main tabs + Export tabs */}
        <div className="flex items-center gap-1">
          {/* Main tabs */}
          {mainTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${theme.borderRadius} transition-all duration-200 cursor-pointer ${
                activeTab === tab.key
                  ? tab.key === 'instructions'
                    ? `${theme.accentBg} text-white shadow-md`
                    : isLightTheme
                      ? 'bg-stone-200/80 ' + theme.textPrimary
                      : 'bg-white/10 ' + theme.textPrimary
                  : `${theme.textMuted} hover:${theme.textSecondary} ${theme.bgCardHover}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          {/* Separator */}
          <div className={`w-px h-5 ${isLightTheme ? 'bg-stone-300' : 'bg-white/10'} mx-1`} />

          {/* Export label */}
          <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textMuted} mr-0.5`}>{t.exportTabs}</span>

          {/* Export tabs */}
          {exportTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium ${theme.borderRadius} transition-all duration-200 cursor-pointer ${
                activeTab === tab.key
                  ? isLightTheme
                    ? 'bg-stone-200/80 ' + theme.textPrimary
                    : 'bg-white/10 ' + theme.textPrimary
                  : `${theme.textMuted} hover:${theme.textSecondary} ${theme.bgCardHover}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 ${theme.bgCardHover} ${theme.textMuted} ${theme.borderRadius} transition-all duration-200 cursor-pointer`}
            title={t.settingsTitle}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          currentWorkflowName={currentWorkflowName}
          onLoad={handleLoad}
          onNew={handleNew}
          onSave={handleSave}
          onImportWorkflow={handleImportWorkflow}
          hasUnsavedChanges={hasUnsavedChanges}
          refreshKey={refreshKey}
        />

        {/* Center: Canvas or tab content */}
        {activeTab === 'editor' ? (
          <WorkflowCanvas
            workflow={workflow}
            onNodeClick={handleNodeClick}
            onNodeMove={handleNodeMove}
            onConnect={handleConnect}
            onAddNode={handleAddNode}
            onDeleteEdge={handleDeleteEdge}
            selectedNodeId={selectedNode?.node_id ?? null}
          />
        ) : (
          renderTabContent()
        )}

        {/* Right panel: Node properties */}
        {selectedNode && activeTab === 'editor' && (
          <NodeProperties
            node={selectedNode}
            allNodeIds={workflow.nodes.map(n => n.node_id)}
            onClose={() => setSelectedNode(null)}
            onDelete={handleDeleteNode}
            onUpdate={handleUpdateNode}
          />
        )}
      </div>

      {/* Welcome Modal */}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}

      {/* Settings overlay - right side */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/20 backdrop-blur-[2px]"
          onClick={() => setShowSettings(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppInner />
  </ToastProvider>
);

export default App;
