import React, { useState } from 'react';
import { X, CreditCard, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { PAYMENT_STRATEGY } from '../lib/paymentStrategy';
import { computeCents } from '../lib/gumroadPayment';
import { StrategyAService } from '../lib/gumroadStrategyA';
import { StrategyBService } from '../lib/gumroadStrategyB';
import type { PaymentParams } from '../lib/gumroadPayment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentToken: string) => void;
  type: 'workflow' | 'sop';
  nodeCount?: number;
  description: string;
}

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_CANCELLED: '已取消付款。',
  PAYMENT_CONFIRMATION_TIMEOUT: '付款確認中，請稍後重試。',
  PAYMENT_SESSION_EXPIRED: '付款工作階段已逾期，請重新嘗試。',
  STRATEGY_A_NO_LICENSE_KEY: '驗證失敗，請聯絡客服。',
};

const paymentService = PAYMENT_STRATEGY === 'A'
  ? new StrategyAService()
  : new StrategyBService();

const GumroadPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  nodeCount,
  description,
}) => {
  const { theme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const params: PaymentParams = { type, nodeCount };
  const cents = computeCents(params);

  const handlePay = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const result = await paymentService.pay(params);
      onSuccess(result.payment_token);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      if (code === 'PAYMENT_CANCELLED') {
        setIsProcessing(false);
        return;
      }
      setError(ERROR_MESSAGES[code] ?? '付款失敗，請重試。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-sm mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>
              確認付款
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:text-white transition-all`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Cost summary */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <p className={`text-sm ${theme.textSecondary} mb-3`}>{description}</p>
            <div className="flex justify-between items-center">
              <span className={`text-sm ${theme.textMuted}`}>金額</span>
              <span className={`text-2xl font-bold ${theme.textPrimary}`}>
                {formatUSD(cents)}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
              <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
              <p className="text-xs text-blue-400">
                等待 Gumroad 付款完成...
              </p>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                前往 Gumroad 付款 {formatUSD(cents)}
              </>
            )}
          </button>

          <p className={`text-center text-[11px] ${theme.textMuted}`}>
            付款視窗將在新頁面開啟。完成後請回到此頁面。
          </p>
        </div>
      </div>
    </div>
  );
};

export default GumroadPaymentModal;
