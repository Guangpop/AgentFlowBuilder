import React, { useState } from 'react';
import { X, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Paddle types
declare global {
  interface Window {
    Paddle?: {
      Checkout: {
        open: (options: PaddleCheckoutOptions) => void;
      };
    };
  }
}

interface PaddleCheckoutOptions {
  settings?: {
    displayMode?: 'overlay' | 'inline';
    theme?: 'light' | 'dark';
    locale?: string;
    variant?: 'one-page' | 'multi-page';
    successUrl?: string;
  };
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customData?: Record<string, string | number>;
  customer?: {
    email?: string;
  };
}

interface Props {
  requiredAmount: number;
  currentBalance: number;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TOPUP_OPTIONS = [3, 5, 10, 20, 50];

// Map amounts to environment variable names
const PRICE_ID_MAP: Record<number, string> = {
  3: import.meta.env.VITE_PADDLE_PRICE_3 || '',
  5: import.meta.env.VITE_PADDLE_PRICE_5 || '',
  10: import.meta.env.VITE_PADDLE_PRICE_10 || '',
  20: import.meta.env.VITE_PADDLE_PRICE_20 || '',
  50: import.meta.env.VITE_PADDLE_PRICE_50 || '',
};

const PaymentModal: React.FC<Props> = ({
  requiredAmount,
  currentBalance,
  description,
  onConfirm,
  onCancel,
}) => {
  const { theme, t } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopup, setIsLoadingTopup] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shortfall = requiredAmount - currentBalance;
  const canAfford = currentBalance >= requiredAmount;

  const handleTopup = async (amount: number) => {
    setIsLoadingTopup(amount);
    setError(null);

    try {
      if (!user?.id) {
        setError(t.accountLoginRequired || 'Please log in to continue');
        return;
      }

      const priceId = PRICE_ID_MAP[amount];
      if (!priceId) {
        setError('Price not configured for this amount');
        return;
      }

      if (!window.Paddle) {
        setError('Payment system not loaded. Please refresh the page.');
        return;
      }

      // Store pending action for after payment
      sessionStorage.setItem('pendingAction', JSON.stringify({
        type: 'generate',
        description,
      }));

      // Open Paddle checkout overlay
      window.Paddle.Checkout.open({
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          variant: 'one-page',
          successUrl: `${window.location.origin}?payment=success&amount=${amount}`,
        },
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        customData: {
          user_id: user.id,
          amount: amount.toString(),
        },
        customer: {
          email: user.email || undefined,
        },
      });

      // Close the modal since Paddle overlay is now open
      setIsLoadingTopup(null);

    } catch (err) {
      console.error('Topup error:', err);
      setError(t.accountTopupError || 'Failed to process topup. Please try again.');
      setIsLoadingTopup(null);
    }
  };

  const handleSinglePayment = async () => {
    // Round up to nearest valid amount
    const paymentAmount = TOPUP_OPTIONS.find(a => a >= shortfall) || TOPUP_OPTIONS[TOPUP_OPTIONS.length - 1];
    await handleTopup(paymentAmount);
  };

  const handleConfirm = () => {
    setIsLoading(true);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-400" />
            <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>
              {canAfford ? (t.paymentConfirmTitle || 'Confirm Payment') : (t.paymentInsufficientTitle || 'Insufficient Balance')}
            </h2>
          </div>
          <button
            onClick={onCancel}
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
                <span className={`text-xl font-bold ${theme.textPrimary}`}>${requiredAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${theme.textMuted}`}>{t.paymentCurrentBalance || 'Current Balance'}</span>
                <span className={`text-lg font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${currentBalance.toFixed(2)}
                </span>
              </div>
              {!canAfford && (
                <div className={`pt-2 mt-2 border-t ${theme.borderColorLight} flex justify-between items-center`}>
                  <span className={`text-sm ${theme.textMuted}`}>{t.paymentShortfall || 'Shortfall'}</span>
                  <span className="text-lg font-bold text-amber-400">
                    ${shortfall.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {canAfford ? (
            /* Confirm Button - Sufficient Balance */
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold ${theme.borderRadius} transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.paymentProcessing || 'Processing...'}
                </>
              ) : (
                t.paymentConfirmButton || 'Confirm Payment'
              )}
            </button>
          ) : (
            /* Topup Options - Insufficient Balance */
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-400" />
                  <label className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider`}>
                    {t.paymentSelectTopup || 'Select Topup Amount'}
                  </label>
                </div>
                <p className={`text-sm ${theme.textSecondary}`}>
                  {t.paymentShortfallHint || 'You need'} ${shortfall.toFixed(2)} {t.paymentShortfallHintMore || 'more to proceed'}
                </p>

                <div className="grid grid-cols-5 gap-2">
                  {TOPUP_OPTIONS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleTopup(amount)}
                      disabled={isLoadingTopup !== null}
                      className={`relative py-3 ${theme.borderRadius} border transition-all text-center ${
                        isLoadingTopup === amount
                          ? 'border-blue-500 bg-blue-500/20'
                          : amount >= shortfall
                            ? `border-blue-500/50 ${theme.bgCard} hover:bg-blue-500/20`
                            : `${theme.borderColor} ${theme.bgCard} ${theme.bgCardHover} hover:border-blue-500/30`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoadingTopup === amount ? (
                        <Loader2 size={16} className="animate-spin mx-auto text-blue-400" />
                      ) : (
                        <span className={`text-sm font-bold ${amount >= shortfall ? 'text-blue-400' : theme.textPrimary}`}>
                          ${amount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`border-t ${theme.borderColorLight} pt-4`}>
                <button
                  onClick={handleSinglePayment}
                  disabled={isLoadingTopup !== null}
                  className={`w-full py-3 border ${theme.borderColor} ${theme.bgCardHover} ${theme.textSecondary} ${theme.borderRadius} font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <CreditCard size={16} />
                  {t.paymentSinglePayment || 'Single Payment'} ${Math.max(Math.ceil(shortfall), TOPUP_OPTIONS[0])}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
