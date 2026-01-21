import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Loader2, Lock, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { setupCardForm, onCardUpdate, getPrime, TapPayCardUpdate } from '../lib/tappay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (prime: string) => void;
  amount: number;
  description: string;
}

const InstantPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  amount,
  description,
}) => {
  const { theme, t } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canGetPrime, setCanGetPrime] = useState(false);
  const cardFormInitialized = useRef(false);

  // Initialize TapPay card form when modal opens
  useEffect(() => {
    if (isOpen && !cardFormInitialized.current) {
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
  }, [isOpen, t]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      cardFormInitialized.current = false;
      setCanGetPrime(false);
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!canGetPrime) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Get prime from TapPay
      const result = await getPrime();

      if (result.status !== 0) {
        setError(result.msg || t.accountCardError || '信用卡資訊錯誤');
        setIsProcessing(false);
        return;
      }

      // Pass prime to parent for API call
      onPaymentSuccess(result.card.prime);
    } catch (err) {
      console.error('Payment error:', err);
      setError(t.paymentError || '付款處理失敗，請稍後再試');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-sm mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <h2 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider flex items-center gap-2`}>
            <CreditCard size={18} className="text-blue-500" />
            {t.paymentConfirmTitle || '確認付款'}
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:text-white transition-all disabled:opacity-50`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Description */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <p className={`text-xs ${theme.textMuted} uppercase tracking-wider mb-1`}>
              {t.paymentDescription || '服務項目'}
            </p>
            <p className={`text-sm font-medium ${theme.textPrimary}`}>
              {description}
            </p>
          </div>

          {/* Amount */}
          <div className={`p-4 ${theme.bgTertiary} ${theme.borderRadiusLg} border ${theme.borderColorLight}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${theme.textMuted} uppercase tracking-wider`}>
                {t.paymentCost || '費用'}
              </span>
              <span className={`text-2xl font-black ${theme.textPrimary}`}>
                NT${amount}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Credit Card Form */}
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
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={!canGetPrime || isProcessing}
            className={`w-full py-3 ${theme.borderRadius} font-medium transition-all ${
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
              `${t.paymentConfirmButton || '確認付款'} NT$${amount}`
            )}
          </button>

          {/* Security Note */}
          <p className={`text-[10px] ${theme.textMuted} text-center flex items-center justify-center gap-1`}>
            <Lock size={10} />
            {t.accountSecurePayment || '安全加密付款 by TapPay'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstantPaymentModal;
