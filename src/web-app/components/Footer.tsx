import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { TermsOfService, PrivacyPolicy, RefundPolicy } from './LegalPages';

const Footer: React.FC = () => {
  const { theme, language } = useTheme();
  const isZhTW = language === 'zh-TW';

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  return (
    <>
      <footer className={`absolute bottom-0 left-0 right-0 h-8 ${theme.bgSecondary} border-t ${theme.borderColorLight} flex items-center justify-center gap-4 text-xs ${theme.textMuted} z-10`}>
        <span>&copy; 2026 AI Agent Workflow Builder</span>
        <span>|</span>
        <button
          onClick={() => setShowTerms(true)}
          className="hover:text-blue-400 transition-colors"
        >
          {isZhTW ? '服務條款' : 'Terms of Service'}
        </button>
        <button
          onClick={() => setShowPrivacy(true)}
          className="hover:text-blue-400 transition-colors"
        >
          {isZhTW ? '隱私政策' : 'Privacy Policy'}
        </button>
        <button
          onClick={() => setShowRefund(true)}
          className="hover:text-blue-400 transition-colors"
        >
          {isZhTW ? '退款政策' : 'Refund Policy'}
        </button>
      </footer>

      <TermsOfService isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <RefundPolicy isOpen={showRefund} onClose={() => setShowRefund(false)} />
    </>
  );
};

export default Footer;
