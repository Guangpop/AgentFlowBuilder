import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Save, Trash2, FileText, Clock, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface WorkflowListItem {
  name: string;
  path: string;
  modified: string;
  nodeCount: number;
  description: string;
}

interface Props {
  currentWorkflowName: string | null;
  onLoad: (name: string) => void;
  onNew: () => void;
  onSave: () => void;
  onImportWorkflow: (workflow: any, name: string) => void;
  hasUnsavedChanges: boolean;
  refreshKey: number;
}

const ChatSidebar: React.FC<Props> = ({
  currentWorkflowName,
  onLoad,
  onNew,
  onSave,
  onImportWorkflow,
  hasUnsavedChanges,
  refreshKey,
}) => {
  const { theme, themeId, t } = useTheme();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/list');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows, refreshKey]);

  const handleDelete = async (name: string) => {
    if (deleteConfirm !== name) {
      setDeleteConfirm(name);
      return;
    }
    try {
      const res = await fetch(`/api/delete/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w.name !== name));
      }
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
    setDeleteConfirm(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const name = file.name.replace(/\.json$/, '');
        // Support both { nodes, edges, ... } and { workflow: { ... } } formats
        const workflow = data.workflow || data;
        onImportWorkflow(workflow, name);
      } catch (err) {
        console.error('Failed to import JSON:', err);
      }
    };
    input.click();
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  const isLight = themeId === 'warm' || themeId === 'minimal';

  return (
    <div className={`w-[280px] flex flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} ${isLight ? 'shadow-[4px_0_20px_rgba(0,0,0,0.05)]' : 'shadow-[4px_0_20px_rgba(0,0,0,0.3)]'} z-10 transition-colors duration-500`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${theme.borderColorLight}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-teal-500 rounded-xl shadow-md">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className={`text-sm font-bold ${theme.textPrimary} tracking-tight`}>{t.sidebarTitle}</h1>
            <p className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>{t.sidebarSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`px-3 py-2.5 border-b ${theme.borderColorLight} space-y-2`}>
        <button
          onClick={onNew}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold ${theme.accentBg} ${theme.accentBgHover} text-white rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] shadow-md`}
        >
          <Plus size={16} />
          New
        </button>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium ${
              hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-400 text-white ring-2 ring-amber-400/50'
                : isLight
                  ? 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                  : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary}`
            } ${theme.borderRadius} border ${hasUnsavedChanges ? 'border-amber-400' : theme.borderColor} transition-all duration-200 cursor-pointer`}
          >
            <Save size={13} />
            Save{hasUnsavedChanges ? ' *' : ''}
          </button>
          <button
            onClick={handleImportJson}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium ${isLight ? 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200' : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary}`} ${theme.borderRadius} border ${theme.borderColor} transition-all duration-200 cursor-pointer`}
          >
            <Upload size={13} />
            Import
          </button>
        </div>
      </div>

      {/* Workflow list header */}
      <div className={`px-3 py-2 border-b ${theme.borderColorLight} flex items-center justify-between`}>
        <span className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider`}>Workflows</span>
        <button
          onClick={fetchWorkflows}
          className={`p-1 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} transition-all`}
          title="Refresh list"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className={`flex items-center justify-center py-8 ${theme.textMuted}`}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-10 gap-3 ${theme.textMuted}`}>
            <FileText size={28} className="opacity-30" />
            <p className="text-xs font-medium opacity-60">{t.noWorkflows || '還沒有 Workflow'}</p>
            <p className="text-[10px] opacity-40 text-center px-4 leading-relaxed">
              {t.noWorkflowsHint || '使用上方 New 建立新流程，或 Import JSON 匯入'}
            </p>
          </div>
        ) : (
          workflows.map((wf) => {
            const isActive = currentWorkflowName === wf.name;
            return (
              <div
                key={wf.name}
                onClick={() => onLoad(wf.name)}
                className={`group cursor-pointer p-2.5 ${theme.borderRadius} border-l-4 border transition-all duration-200 ${
                  isActive
                    ? isLight ? 'bg-teal-50 border-teal-400 border-l-teal-500' : 'bg-teal-900/20 border-teal-500/40 border-l-teal-400'
                    : `${theme.bgCard} ${theme.borderColor} border-l-transparent ${theme.bgCardHover}`
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText size={12} className={isActive ? 'text-teal-500 shrink-0' : `${theme.textMuted} shrink-0`} />
                    <span className={`text-xs font-medium truncate ${isActive ? (isLight ? 'text-teal-800' : 'text-teal-200') : theme.textPrimary}`}>
                      {wf.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isLight ? 'bg-stone-200 text-stone-600' : 'bg-slate-700 text-slate-400'}`}>
                      {wf.nodeCount}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(wf.name);
                      }}
                      className={`p-0.5 ${theme.borderRadius} transition-all opacity-0 group-hover:opacity-100 cursor-pointer ${
                        deleteConfirm === wf.name
                          ? 'text-red-400 bg-red-900/30 opacity-100'
                          : `${theme.textMuted} hover:text-red-400`
                      }`}
                      title={deleteConfirm === wf.name ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                {wf.description && (
                  <p className={`text-[10px] ${theme.textMuted} mt-1 leading-relaxed`}>
                    {truncate(wf.description, 60)}
                  </p>
                )}
                <div className={`flex items-center gap-2 mt-1.5 text-[9px] ${theme.textMuted}`}>
                  <Clock size={8} className="inline" />
                  <span>{formatDate(wf.modified)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
