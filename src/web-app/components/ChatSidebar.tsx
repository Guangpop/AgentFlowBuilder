import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Save, Trash2, FileText, Clock, Loader2 } from 'lucide-react';
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
  hasUnsavedChanges: boolean;
  refreshKey: number;
}

const ChatSidebar: React.FC<Props> = ({
  currentWorkflowName,
  onLoad,
  onNew,
  onSave,
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

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <div className={`w-[280px] flex flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} shadow-[4px_0_20px_rgba(0,0,0,0.3)] z-10 transition-colors duration-500`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${theme.borderColorLight}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-md shadow-blue-900/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className={`text-sm font-bold ${theme.textPrimary} tracking-tight`}>{t.sidebarTitle}</h1>
            <p className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-wider`}>{t.sidebarSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`px-3 py-2 border-b ${theme.borderColorLight} flex gap-2`}>
        <button
          onClick={onNew}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium ${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary} ${theme.borderRadius} border ${theme.borderColor} transition-all`}
        >
          <Plus size={13} />
          New
        </button>
        <button
          onClick={onSave}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium ${
            hasUnsavedChanges
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary}`
          } ${theme.borderRadius} border ${hasUnsavedChanges ? 'border-blue-500' : theme.borderColor} transition-all`}
        >
          <Save size={13} />
          Save{hasUnsavedChanges ? ' *' : ''}
        </button>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className={`flex items-center justify-center py-8 ${theme.textMuted}`}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className={`text-center py-8 text-xs ${theme.textMuted}`}>
            No saved workflows
          </div>
        ) : (
          workflows.map((wf) => {
            const isActive = currentWorkflowName === wf.name;
            return (
              <div
                key={wf.name}
                onClick={() => onLoad(wf.name)}
                className={`group cursor-pointer p-2.5 ${theme.borderRadius} border transition-all ${
                  isActive
                    ? `${themeId === 'minimal' ? 'bg-blue-50 border-blue-300' : 'bg-blue-900/20 border-blue-500/40'}`
                    : `${theme.bgCard} ${theme.borderColor} ${theme.bgCardHover}`
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText size={12} className={isActive ? 'text-blue-400 shrink-0' : `${theme.textMuted} shrink-0`} />
                    <span className={`text-xs font-medium truncate ${isActive ? (themeId === 'minimal' ? 'text-blue-900' : 'text-blue-200') : theme.textPrimary}`}>
                      {wf.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(wf.name);
                    }}
                    className={`shrink-0 p-0.5 ${theme.borderRadius} transition-all opacity-0 group-hover:opacity-100 ${
                      deleteConfirm === wf.name
                        ? 'text-red-400 bg-red-900/30 opacity-100'
                        : `${theme.textMuted} hover:text-red-400`
                    }`}
                    title={deleteConfirm === wf.name ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                {wf.description && (
                  <p className={`text-[10px] ${theme.textMuted} mt-1 leading-relaxed`}>
                    {truncate(wf.description, 60)}
                  </p>
                )}
                <div className={`flex items-center gap-2 mt-1.5 text-[9px] ${theme.textMuted}`}>
                  <span>{wf.nodeCount} nodes</span>
                  <span className="opacity-50">|</span>
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
