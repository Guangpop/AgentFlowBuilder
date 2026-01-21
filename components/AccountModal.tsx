import React, { useState, useEffect } from 'react';
import { X, Wallet, LogOut, TrendingUp, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase, withTimeout } from '../lib/supabase';
import { Transaction } from '../lib/database.types';

interface Props {
  onClose: () => void;
}

const MAX_TRANSACTIONS = 20;

const AccountModal: React.FC<Props> = ({ onClose }) => {
  const { user, profile, signOut } = useAuth();
  const { theme, t, language } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!supabase) return;

    setIsLoadingTransactions(true);
    try {
      const result = await withTimeout(
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(MAX_TRANSACTIONS),
        5000,
        { data: [], error: null }
      );

      const { data, error } = result;

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      if (data) {
        setTransactions(data);
      }
    } catch (err) {
      console.warn('[AccountModal] fetchTransactions timed out');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    // All transactions are now charges (negative amounts stored as negative)
    const displayAmount = Math.abs(amount);
    return `NT$${Math.floor(displayAmount)}`;
  };

  const totalSpent = profile?.total_spent || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 max-h-[90vh] flex flex-col ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider flex items-center gap-2`}>
            <Wallet size={18} className="text-emerald-500" />
            {t.accountTitle || 'Account'}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:text-white transition-all`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Info Section */}
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-14 h-14 rounded-full border-2 border-emerald-500/30"
              />
            ) : (
              <div className={`w-14 h-14 rounded-full ${theme.bgTertiary} flex items-center justify-center`}>
                <span className={`text-xl font-bold ${theme.textPrimary}`}>
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${theme.textPrimary} truncate`}>
                {user?.email}
              </p>
              <p className={`text-xs ${theme.textMuted} mt-1`}>
                {t.accountMemberSince || 'Member since'} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-orange-400" />
                <span className={`text-[10px] ${theme.textMuted} uppercase tracking-wider`}>
                  {t.accountTotalSpent || 'Total Spent'}
                </span>
              </div>
              <p className={`text-2xl font-black ${theme.textPrimary}`}>
                NT${Math.floor(totalSpent)}
              </p>
            </div>
            <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-violet-400" />
                <span className={`text-[10px] ${theme.textMuted} uppercase tracking-wider`}>
                  {t.accountTransactions || 'Transactions'}
                </span>
              </div>
              <p className={`text-2xl font-black ${theme.textPrimary}`}>
                {transactions.length}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className={`border-t ${theme.borderColorLight}`} />

          {/* Transaction History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-violet-400" />
              <label className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider`}>
                {t.accountRecentTransactions || 'Recent Transactions'}
              </label>
            </div>

            <div className={`max-h-64 overflow-y-auto ${theme.borderRadius} border ${theme.borderColor}`}>
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className={`animate-spin ${theme.textMuted}`} />
                </div>
              ) : transactions.length === 0 ? (
                <div className={`py-8 text-center ${theme.textMuted} text-sm`}>
                  {t.accountNoTransactions || 'No transactions yet'}
                </div>
              ) : (
                <div className={`divide-y ${theme.borderColorLight}`}>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className={`px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-full bg-orange-500/20">
                          <ArrowUpRight size={14} className="text-orange-500" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${theme.textPrimary}`}>
                            {tx.description}
                          </p>
                          <p className={`text-[10px] ${theme.textMuted}`}>
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-500">
                        {formatAmount(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme.borderColorLight} ${theme.bgSecondary}`}>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 ${theme.borderRadius} transition-all border border-red-500/30 text-sm font-medium`}
          >
            <LogOut size={16} />
            {t.accountLogout || 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
