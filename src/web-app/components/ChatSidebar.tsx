import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Plus, Save, Trash2, FileText, Clock, Loader2, RefreshCw, Upload, File, Link, ChevronDown, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { parseWorkflowMd, WorkflowMdParseError } from '@shared/workflowMd';
import { shapeMdToWorkflow } from '@shared/mdToWorkflow';
import { useToast } from '../contexts/ToastContext';

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

const FILE_ACCEPT = '.md,.json,.docx,.pptx,.xlsx,.xls,.pdf,.html,.htm,.epub,.txt,.csv,.jpg,.jpeg,.png,.mp3,.wav,.m4a';

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
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Import flow state
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importMode, setImportMode] = useState<'menu' | 'url'>('menu');
  const [urlInput, setUrlInput] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuWrapperRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!importMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
        setImportMode('menu');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImportMenuOpen(false);
        setImportMode('menu');
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [importMenuOpen]);

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

  const handleImportFileClick = () => {
    setImportMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting same file
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop() || '';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    try {
      setImportBusy(true);
      if (ext === 'json') {
        // Native parse
        const text = await file.text();
        const data = JSON.parse(text);
        const workflow = data.workflow || data;
        onImportWorkflow(workflow, baseName);
        showToast((t as any).importedToast || `Imported ${file.name}`, 'success');
        return;
      }

      if (ext === 'md') {
        const text = await file.text();
        // Try workflow.md schema first
        try {
          const result = parseWorkflowMd(text);
          onImportWorkflow(result.workflow, baseName);
          showToast((t as any).importedToast || `Imported ${file.name}`, 'success');
          return;
        } catch (err) {
          if (err instanceof WorkflowMdParseError) {
            // Generic markdown → shape into workflow draft
            const { workflow, warnings } = shapeMdToWorkflow(text, baseName);
            onImportWorkflow(workflow, baseName);
            const hint = warnings.length > 0 ? `: ${warnings[0]}` : '';
            showToast((t as any).importedAsDraftToast || `Imported as draft${hint}`, 'success');
            return;
          }
          throw err;
        }
      }

      // Binary/other → upload to /api/import; backend runs markitdown
      const buf = await file.arrayBuffer();
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(file.name),
          'content-type': 'application/octet-stream',
        },
        body: buf,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Import failed (${res.status})`);
      }
      const json = await res.json();
      onImportWorkflow(json.workflow, baseName);
      const hint = json.warnings?.length ? `: ${json.warnings[0]}` : '';
      showToast((t as any).importedAsDraftToast || `Imported as draft${hint}`, 'success');
    } catch (err: any) {
      console.error('Import failed:', err);
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setImportBusy(false);
    }
  };

  const handleImportUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      setImportBusy(true);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Import failed (${res.status})`);
      }
      const json = await res.json();
      const name = json.workflow?.name || url;
      onImportWorkflow(json.workflow, name);
      const hint = json.warnings?.length ? `: ${json.warnings[0]}` : '';
      showToast((t as any).importedAsDraftToast || `Imported as draft${hint}`, 'success');
      setUrlInput('');
      setImportMenuOpen(false);
      setImportMode('menu');
    } catch (err: any) {
      console.error('URL import failed:', err);
      showToast(err.message || 'URL import failed', 'error');
    } finally {
      setImportBusy(false);
    }
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  const isLight = themeId === 'warm' || themeId === 'minimal';

  // Dropdown must be fully opaque (theme.bgCard is semi-transparent in techDark/glass).
  const importMenuPanelBg =
    themeId === 'warm' ? 'bg-white' :
    themeId === 'minimal' ? 'bg-white' :
    themeId === 'glassmorphism' ? 'bg-slate-900/95 backdrop-blur-xl' :
    'bg-slate-800';
  const importMenuItemHover = isLight ? 'hover:bg-stone-100' : 'hover:bg-slate-700/60';

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

          {/* Import — dropdown trigger with File / URL submenu */}
          <div className="relative flex-1" ref={menuWrapperRef}>
            <button
              onClick={() => {
                if (importBusy) return;
                setImportMode('menu');
                setImportMenuOpen((v) => !v);
              }}
              disabled={importBusy}
              aria-haspopup="menu"
              aria-expanded={importMenuOpen}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium ${isLight ? 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200' : `${theme.bgTertiary} ${theme.bgCardHover} ${theme.textPrimary}`} ${theme.borderRadius} border ${theme.borderColor} transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait`}
            >
              {importBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Import
              <ChevronDown size={11} className={`transition-transform ${importMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Dropdown panel */}
            {importMenuOpen && (
              <div
                role="menu"
                className={`absolute z-40 top-full right-0 mt-1 w-56 ${importMenuPanelBg} border ${theme.borderColor} ${theme.borderRadius} shadow-xl overflow-hidden`}
              >
                {importMode === 'menu' && (
                  <>
                    <button
                      role="menuitem"
                      onClick={handleImportFileClick}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left ${importMenuItemHover} transition-colors cursor-pointer`}
                    >
                      <File size={14} className={`mt-0.5 shrink-0 ${theme.accentColor}`} />
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                          {(t as any).importFromFile || 'From file'}
                        </div>
                        <div className={`text-[10px] ${theme.textMuted} leading-snug`}>
                          {(t as any).importFromFileHint || '.md / .json / .pdf / .docx / .pptx / image …'}
                        </div>
                      </div>
                    </button>
                    <div className={`border-t ${theme.borderColorLight}`} />
                    <button
                      role="menuitem"
                      onClick={() => setImportMode('url')}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left ${importMenuItemHover} transition-colors cursor-pointer`}
                    >
                      <Link size={14} className={`mt-0.5 shrink-0 ${theme.accentColor}`} />
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                          {(t as any).importFromUrl || 'From URL'}
                        </div>
                        <div className={`text-[10px] ${theme.textMuted} leading-snug`}>
                          {(t as any).importFromUrlHint || 'Article URL or YouTube link'}
                        </div>
                      </div>
                    </button>
                  </>
                )}

                {importMode === 'url' && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                        {(t as any).urlInputLabel || 'Import from URL'}
                      </label>
                      <button
                        onClick={() => setImportMode('menu')}
                        className={`p-0.5 ${theme.textMuted} hover:${theme.textPrimary} cursor-pointer`}
                        aria-label="Back"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleImportUrlSubmit();
                      }}
                      placeholder={(t as any).urlPlaceholder || 'https://… or YouTube link'}
                      autoFocus
                      className={`w-full px-2 py-1.5 text-xs ${theme.bgInput} ${theme.borderColor} border ${theme.borderRadius} ${theme.textPrimary} focus:outline-none focus:ring-2 ${theme.accentRing}`}
                    />
                    <button
                      onClick={handleImportUrlSubmit}
                      disabled={!urlInput.trim() || importBusy}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold ${theme.accentBg} ${theme.accentBgHover} text-white ${theme.borderRadius} transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {importBusy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {(t as any).importButton || 'Import'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
              {t.noWorkflowsHint || '使用上方 New 建立新流程，或 Import 匯入'}
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
                  <p className={`text-[10px] ${theme.textMuted} leading-relaxed mt-1 line-clamp-2`}>
                    {truncate(wf.description, 80)}
                  </p>
                )}
                <div className={`flex items-center gap-1 mt-1.5 ${theme.textMuted} text-[9px]`}>
                  <Clock size={9} />
                  {formatDate(wf.modified)}
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
