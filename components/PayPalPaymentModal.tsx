import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { X, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { TOPUP_OPTIONS, formatUSD } from '../lib/paypal';
import { isAnonymousMode } from '../lib/mode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'workflow' | 'sop';
  amount: number;
  nodeCount?: number;
  description: string;
  currentBalance: number;
}

const PayPalPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  amount,
  nodeCount,
  description,
  currentBalance,
}) => {
  const { theme, t } = useTheme();
  const { user, session, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopup, setSelectedTopup] = useState<number | null>(null);

  // In anonymous mode, treat user as not registered (no balance, no topup)
  const isRegisteredUser = Boolean(user) && !isAnonymousMode;
  const effectiveBalance = isRegisteredUser ? currentBalance : 0;
  const canAfford = effectiveBalance >= amount;
  const shortfall = amount - effectiveBalance;

  if (!isOpen) return null;

  const handleConfirmWithBalance = async () => {
    setIsProcessing(true);
    onSuccess();
  };

  const token = session?.access_token;

  const createOrder = async (orderType: 'workflow' | 'sop' | 'topup', orderAmount?: number) => {
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        type: orderType,
        amount: orderAmount,
        nodeCount: type === 'sop' ? nodeCount : undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.orderId;
  };

  const captureOrder = async (orderId: string, orderType: string) => {
    const response = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ orderId, type: orderType }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-md mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>
              {canAfford ? (t.paymentConfirmTitle || 'Confirm Payment') : (t.paymentInsufficientTitle || 'Insufficient Balance')}
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
          {/* Cost Summary */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <p className={`text-sm ${theme.textSecondary} mb-3`}>{description}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${theme.textMuted}`}>{t.paymentCost || 'Cost'}</span>
                <span className={`text-xl font-bold ${theme.textPrimary}`}>{formatUSD(amount)}</span>
              </div>
              {isRegisteredUser && (
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme.textMuted}`}>{t.paymentCurrentBalance || 'Current Balance'}</span>
                  <span className={`text-lg font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatUSD(effectiveBalance)}
                  </span>
                </div>
              )}
              {isRegisteredUser && !canAfford && (
                <div className={`pt-2 mt-2 border-t ${theme.borderColorLight} flex justify-between items-center`}>
                  <span className={`text-sm ${theme.textMuted}`}>{t.paymentShortfall || 'Shortfall'}</span>
                  <span className="text-lg font-bold text-amber-400">{formatUSD(shortfall)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Payment Options */}
          {canAfford && isRegisteredUser ? (
            <button
              onClick={handleConfirmWithBalance}
              disabled={isProcessing}
              className={`w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold ${theme.borderRadius} transition-all disabled:opacity-50`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {t.paymentProcessing || 'Processing...'}
                </span>
              ) : (
                `${t.paymentConfirmButton || 'Confirm Payment'} ${formatUSD(amount)}`
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Direct Payment */}
              <div>
                <p className={`text-xs ${theme.textMuted} uppercase tracking-wider mb-3`}>
                  {t.paymentSinglePayment || 'Single Payment'}
                </p>
                <PayPalButtons
                  style={{ layout: 'horizontal', height: 45 }}
                  disabled={isProcessing}
                  createOrder={async () => {
                    setError(null);
                    setIsProcessing(true);
                    try {
                      return await createOrder(type);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to create order');
                      setIsProcessing(false);
                      throw err;
                    }
                  }}
                  onApprove={async (data) => {
                    try {
                      await captureOrder(data.orderID, type);
                      onSuccess();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Payment failed');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  onError={() => {
                    setError('Payment failed. Please try again.');
                    setIsProcessing(false);
                  }}
                  onCancel={() => {
                    setIsProcessing(false);
                  }}
                />
              </div>

              {/* Topup Options (Registered Users Only) */}
              {isRegisteredUser && (
                <div className={`pt-4 border-t ${theme.borderColorLight}`}>
                  <p className={`text-xs ${theme.textMuted} uppercase tracking-wider mb-3`}>
                    {t.paymentSelectTopup || 'Or Top Up Your Balance'}
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {TOPUP_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedTopup(opt)}
                        className={`py-2 ${theme.borderRadius} border transition-all text-center ${
                          selectedTopup === opt
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : `${theme.borderColor} ${theme.bgCard} ${theme.textPrimary} hover:border-blue-500/50`
                        }`}
                      >
                        ${opt}
                      </button>
                    ))}
                  </div>
                  {selectedTopup && (
                    <PayPalButtons
                      key={selectedTopup}
                      style={{ layout: 'horizontal', height: 40 }}
                      disabled={isProcessing}
                      createOrder={async () => {
                        setError(null);
                        setIsProcessing(true);
                        try {
                          return await createOrder('topup', selectedTopup);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to create order');
                          setIsProcessing(false);
                          throw err;
                        }
                      }}
                      onApprove={async (data) => {
                        try {
                          await captureOrder(data.orderID, 'topup');
                          await refreshProfile();
                          setSelectedTopup(null);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Top up failed');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      onError={() => {
                        setError('Top up failed. Please try again.');
                        setIsProcessing(false);
                      }}
                      onCancel={() => {
                        setIsProcessing(false);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentModal;
