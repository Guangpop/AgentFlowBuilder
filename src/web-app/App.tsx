import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Workflow, WorkflowNode, NodeType, Edge } from './types';
import { NODE_COLORS } from './constants';
import { generateMermaid, generateMarkdown, cleanWorkflowForExport } from '@shared/export';
import { useTheme } from './contexts/ThemeContext';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeProperties from './components/NodeProperties';
import ChatSidebar from './components/ChatSidebar';
import SettingsPanel from './components/SettingsPanel';
import { Settings, Copy, Download, Check } from 'lucide-react';
import type { LocaleStrings } from './locales';

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

const App: React.FC = () => {
  const { theme, themeId, t } = useTheme();

  const [workflow, setWorkflow] = useState<Workflow>(defaultWorkflow);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'mermaid' | 'markdown' | 'json'>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

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
      }
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  }, [currentWorkflowName, workflow]);

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
  }, []);

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

    let content = '';
    let title = '';
    let copyLabel = '';

    switch (activeTab) {
      case 'mermaid':
        content = generateMermaid(workflow);
        title = t.mermaidDslDef;
        copyLabel = 'Copy Mermaid';
        break;
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

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'editor', label: t.tabCanvas },
    { key: 'mermaid', label: t.tabMermaid },
    { key: 'markdown', label: t.tabMarkdown },
    { key: 'json', label: t.tabJson },
  ];

  return (
    <div className={`h-screen flex flex-col ${theme.bgPrimary} transition-colors duration-500`}>
      {/* Tab bar */}
      <div className={`flex items-center justify-between px-2 border-b ${theme.borderColorLight} ${theme.sidebarBg}`}>
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? `${theme.textPrimary} border-blue-500`
                  : `${theme.textMuted} border-transparent hover:${theme.textSecondary}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pr-2">
          {currentWorkflowName && (
            <span className={`text-[10px] ${theme.textMuted} font-mono`}>
              {currentWorkflowName}{hasUnsavedChanges ? ' *' : ''}
            </span>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textMuted} ${theme.borderRadius} transition-all`}
            title={t.settingsTitle}
          >
            <Settings size={14} />
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

      {/* Settings overlay - right side */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
