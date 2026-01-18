import React, { useState, useEffect, useRef } from 'react';
import { X, Wallet, CreditCard, LogOut, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Transaction } from '../lib/database.types';
import { setupCardForm, onCardUpdate, getPrime, TapPayCardUpdate } from '../lib/tappay';

interface Props {
  onClose: () => void;
}

const TOPUP_OPTIONS = [15, 100, 150, 300]; // TWD
const MAX_TRANSACTIONS = 20;

const AccountModal: React.FC<Props> = ({ onClose }) => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, t, language } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canGetPrime, setCanGetPrime] = useState(false);
  const cardFormInitialized = useRef(false);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Refresh profile when modal opens
  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize TapPay card form when amount is selected
  useEffect(() => {
    if (selectedAmount && !cardFormInitialized.current) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        setupCardForm();
        onCardUpdate((update: TapPayCardUpdate) => {
          setCanGetPrime(update.canGetPrime);
          if (update.hasError) {
            setError(t.accountCardError || '請檢查信用卡資訊');
          } else {
            setError(null);
          }
        });
        cardFormInitialized.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedAmount, t]);

  // Reset card form state when amount is deselected
  useEffect(() => {
    if (!selectedAmount) {
      cardFormInitialized.current = false;
      setCanGetPrime(false);
    }
  }, [selectedAmount]);

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(MAX_TRANSACTIONS);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      if (data) {
        setTransactions(data);
      }
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleSelectAmount = (amount: number) => {
    if (selectedAmount === amount) {
      setSelectedAmount(null);
    } else {
      setSelectedAmount(amount);
      cardFormInitialized.current = false;
    }
    setError(null);
    setSuccess(null);
  };

  const handlePayment = async () => {
    if (!selectedAmount || !user?.id) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get prime from TapPay
      const result = await getPrime();

      if (result.status !== 0) {
        setError(result.msg || t.accountCardError || '信用卡資訊錯誤');
        setIsProcessing(false);
        return;
      }

      console.log('[TapPay Debug] Got prime:', result.card.prime.substring(0, 20) + '...');

      // Call backend to process payment
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError(t.accountLoginRequired || '請先登入');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/payment/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prime: result.card.prime,
          amount: selectedAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t.accountTopupError || '儲值失敗');
        setIsProcessing(false);
        return;
      }

      // Success
      setSuccess(t.accountTopupSuccess || `儲值成功！已加值 NT$${selectedAmount}`);
      setSelectedAmount(null);
      cardFormInitialized.current = false;

      // Refresh profile and transactions
      await refreshProfile();
      await fetchTransactions();

    } catch (err) {
      console.error('Payment error:', err);
      setError(t.accountTopupError || '儲值失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
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

  const formatAmount = (amount: number, type: 'topup' | 'charge') => {
    const sign = type === 'topup' ? '+' : '-';
    return `${sign}NT$${Math.floor(Math.abs(amount))}`;
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

          {/* Balance Card */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${theme.textMuted} uppercase tracking-wider mb-1`}>
                  {t.accountCurrentBalance || 'Current Balance'}
                </p>
                <p className={`text-3xl font-black ${theme.textPrimary}`}>
                  NT${Math.floor(profile?.balance || 0)}
                </p>
              </div>
              <div className={`p-3 bg-emerald-500/20 rounded-full`}>
                <Wallet size={24} className="text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Topup Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-blue-400" />
              <label className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider`}>
                {t.accountTopup || 'Top Up'}
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <p className="text-xs text-emerald-400">{success}</p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {TOPUP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleSelectAmount(amount)}
                  disabled={isProcessing}
                  className={`relative py-3 ${theme.borderRadius} border transition-all text-center ${
                    selectedAmount === amount
                      ? 'border-blue-500 bg-blue-500/20'
                      : `${theme.borderColor} ${theme.bgCard} hover:bg-slate-800 hover:border-blue-500/50`
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className={`text-sm font-bold ${theme.textPrimary}`}>
                    NT${amount}
                  </span>
                </button>
              ))}
            </div>

            {/* Credit Card Form */}
            {selectedAmount && (
              <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight} space-y-3`}>
                <p className={`text-xs ${theme.textMuted} mb-2`}>
                  {t.accountEnterCard || '請輸入信用卡資訊'}
                </p>

                {/* Card Number */}
                <div>
                  <label className={`text-[10px] ${theme.textMuted} uppercase tracking-wider mb-1 block`}>
                    {t.accountCardNumber || '卡號'}
                  </label>
                  <div
                    id="card-number"
                    className={`h-10 px-3 ${theme.bgCard} ${theme.borderRadius} border ${theme.borderColor} flex items-center`}
                  />
                </div>

                {/* Expiry and CCV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] ${theme.textMuted} uppercase tracking-wider mb-1 block`}>
                      {t.accountCardExpiry || '到期日'}
                    </label>
                    <div
                      id="card-expiration-date"
                      className={`h-10 px-3 ${theme.bgCard} ${theme.borderRadius} border ${theme.borderColor} flex items-center`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] ${theme.textMuted} uppercase tracking-wider mb-1 block`}>
                      CCV
                    </label>
                    <div
                      id="card-ccv"
                      className={`h-10 px-3 ${theme.bgCard} ${theme.borderRadius} border ${theme.borderColor} flex items-center`}
                    />
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={!canGetPrime || isProcessing}
                  className={`w-full py-2.5 ${theme.borderRadius} font-medium transition-all ${
                    canGetPrime && !isProcessing
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      {t.accountProcessing || '處理中...'}
                    </span>
                  ) : (
                    `${t.accountPayNow || '立即付款'} NT$${selectedAmount}`
                  )}
                </button>

                <p className={`text-[10px] ${theme.textMuted} text-center`}>
                  {t.accountSecurePayment || '安全加密付款 by TapPay'}
                </p>
              </div>
            )}

            {!selectedAmount && (
              <p className={`text-xs ${theme.textMuted} text-center`}>
                {t.accountTopupHint || '選擇金額開始儲值'}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className={`border-t ${theme.borderColorLight}`} />

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColorLight}`}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={12} className="text-orange-400" />
                <span className={`text-[10px] ${theme.textMuted} uppercase tracking-wider`}>
                  {t.accountTotalSpent || 'Total Spent'}
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.textPrimary}`}>
                NT${Math.floor(totalSpent)}
              </p>
            </div>
            <div className={`p-3 ${theme.bgTertiary} ${theme.borderRadius} border ${theme.borderColorLight}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-violet-400" />
                <span className={`text-[10px] ${theme.textMuted} uppercase tracking-wider`}>
                  {t.accountTransactions || 'Transactions'}
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.textPrimary}`}>
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

            <div className={`max-h-48 overflow-y-auto ${theme.borderRadius} border ${theme.borderColor}`}>
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
                        <div className={`p-1.5 rounded-full ${
                          tx.type === 'topup'
                            ? 'bg-emerald-500/20'
                            : 'bg-orange-500/20'
                        }`}>
                          {tx.type === 'topup' ? (
                            <ArrowDownRight size={14} className="text-emerald-500" />
                          ) : (
                            <ArrowUpRight size={14} className="text-orange-500" />
                          )}
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
                      <span className={`text-sm font-bold ${
                        tx.type === 'topup' ? 'text-emerald-500' : 'text-orange-500'
                      }`}>
                        {formatAmount(tx.amount, tx.type)}
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
