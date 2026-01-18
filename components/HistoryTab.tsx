import React, { useState, useEffect } from 'react';
import { Clock, Download, Trash2, ChevronDown, ChevronRight, FileJson, Loader2, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { WorkflowHistory } from '../lib/database.types';

interface HistoryListItem {
  id: string;
  workflow_name: string;
  node_count: number;
  cost: number;
  created_at: string;
}

const HistoryTab: React.FC = () => {
  const { user } = useAuth();
  const { theme, t, language } = useTheme();
  const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<WorkflowHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/workflow-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistoryItems(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    setIsLoadingDetails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/workflow-history/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExpandedData(data);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
    } else {
      setExpandedId(id);
      setExpandedData(null);
      await fetchDetails(id);
    }
  };

  const handleDownload = async (item: HistoryListItem, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/workflow-history/${item.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data: WorkflowHistory = await response.json();
        const blob = new Blob([JSON.stringify(data.workflow_json, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.workflow_name || 'workflow'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmMessage = t.historyDeleteConfirm || 'Delete this history record?';
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/workflow-history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
        if (expandedId === id) {
          setExpandedId(null);
          setExpandedData(null);
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className={`animate-spin ${theme.textMuted}`} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b ${theme.borderColorLight} ${theme.bgSecondary}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-violet-500/20 rounded-lg`}>
            <History size={20} className="text-violet-500" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${theme.textPrimary}`}>
              {t.historyTitle || 'History'}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {historyItems.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${theme.textMuted}`}>
            <FileJson size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">
              {t.historyEmpty || 'No history yet'}
            </p>
            <p className="text-sm opacity-70">
              {t.historyEmptyHint || 'Create your first workflow to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className={`${theme.bgCard} border ${theme.borderColor} ${theme.borderRadiusLg} overflow-hidden transition-all`}
              >
                {/* Item Header */}
                <div
                  onClick={() => handleExpand(item.id)}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer ${theme.bgCardHover} transition-colors`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button className={`p-1 ${theme.textMuted}`}>
                      {expandedId === item.id ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${theme.textPrimary} truncate`}>
                        {item.workflow_name}
                      </p>
                      <div className={`flex items-center gap-3 mt-1 text-xs ${theme.textMuted}`}>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(item.created_at)}
                        </span>
                        <span>
                          {t.historyNodeCount || 'Nodes'}: {item.node_count}
                        </span>
                        <span>
                          {t.historyCost || 'Cost'}: {formatCost(item.cost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => handleDownload(item, e)}
                      className={`p-2 ${theme.bgTertiary} ${theme.borderRadius} ${theme.textMuted} hover:text-blue-400 transition-colors`}
                      title={t.historyDownload || 'Download JSON'}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={isDeleting === item.id}
                      className={`p-2 ${theme.bgTertiary} ${theme.borderRadius} ${theme.textMuted} hover:text-red-400 transition-colors disabled:opacity-50`}
                      title={t.historyDelete || 'Delete'}
                    >
                      {isDeleting === item.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === item.id && (
                  <div className={`px-4 py-3 border-t ${theme.borderColorLight} ${theme.bgTertiary}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider`}>
                        {t.historyGeneratedPrompt || 'Generated Prompt'}
                      </span>
                    </div>
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className={`animate-spin ${theme.textMuted}`} />
                      </div>
                    ) : expandedData?.generated_prompt ? (
                      <pre className={`text-xs ${theme.textSecondary} whitespace-pre-wrap break-words max-h-64 overflow-y-auto p-3 ${theme.bgInput} ${theme.borderRadius} border ${theme.borderColor}`}>
                        {expandedData.generated_prompt}
                      </pre>
                    ) : (
                      <p className={`text-sm ${theme.textMuted} italic`}>
                        {t.historyNoPrompt || '(No prompt recorded)'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
