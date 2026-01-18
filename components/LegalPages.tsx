import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, title, children }) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-3xl max-h-[80vh] mx-4 ${theme.bgCard} ${theme.borderRadiusXl} border ${theme.borderColor} ${theme.shadowXl} overflow-hidden flex flex-col`}>
        <div className={`px-6 py-4 border-b ${theme.borderColorLight} flex items-center justify-between ${theme.bgSecondary}`}>
          <h2 className={`text-lg font-bold ${theme.textPrimary}`}>{title}</h2>
          <button onClick={onClose} className={`p-1.5 ${theme.bgCardHover} ${theme.borderRadius} ${theme.textMuted} hover:text-white transition-all`}>
            <X size={18} />
          </button>
        </div>
        <div className={`p-6 overflow-y-auto ${theme.textSecondary} prose prose-invert prose-sm max-w-none`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const TermsOfService: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language } = useTheme();
  const isZhTW = language === 'zh-TW';

  return (
    <LegalModal isOpen={isOpen} onClose={onClose} title={isZhTW ? '服務條款' : 'Terms of Service'}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">{isZhTW ? '最後更新：2026年1月18日' : 'Last updated: January 18, 2026'}</p>

        <h3 className="text-white font-semibold">{isZhTW ? '1. 服務說明' : '1. Service Description'}</h3>
        <p>{isZhTW
          ? 'AI Agent Workflow Builder（以下簡稱「本服務」）是一個視覺化的工作流程編輯器，使用 AI 技術將自然語言描述轉換為結構化的 AI Agent 工作流程。'
          : 'AI Agent Workflow Builder ("the Service") is a visual workflow editor that uses AI technology to convert natural language descriptions into structured AI agent workflows.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '2. 使用條件' : '2. Terms of Use'}</h3>
        <p>{isZhTW
          ? '使用本服務，您同意：(a) 您已年滿18歲或達到您所在司法管轄區的法定成年年齡；(b) 您將遵守所有適用的法律法規；(c) 您不會將本服務用於任何非法或未經授權的目的。'
          : 'By using the Service, you agree that: (a) you are at least 18 years old or have reached the age of majority in your jurisdiction; (b) you will comply with all applicable laws and regulations; (c) you will not use the Service for any illegal or unauthorized purpose.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '3. 帳戶與付款' : '3. Account & Payment'}</h3>
        <p>{isZhTW
          ? '本服務採用預付費模式。您購買的點數可用於生成工作流程。點數一經購買，除非本政策另有規定，否則不可退款。'
          : 'The Service operates on a prepaid credit system. Credits purchased can be used to generate workflows. Credits are non-refundable once purchased, unless otherwise specified in our policy.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '4. 智慧財產權' : '4. Intellectual Property'}</h3>
        <p>{isZhTW
          ? '您使用本服務創建的工作流程歸您所有。但本服務的底層技術、設計和品牌仍為我們的財產。'
          : 'Workflows you create using the Service belong to you. However, the underlying technology, design, and branding of the Service remain our property.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '5. 免責聲明' : '5. Disclaimer'}</h3>
        <p>{isZhTW
          ? '本服務按「現狀」提供，不提供任何明示或暗示的保證。我們不保證服務不會中斷或無錯誤。'
          : 'The Service is provided "as is" without any warranties, express or implied. We do not guarantee that the Service will be uninterrupted or error-free.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '6. 責任限制' : '6. Limitation of Liability'}</h3>
        <p>{isZhTW
          ? '在適用法律允許的最大範圍內，我們不對因使用或無法使用本服務而導致的任何間接、附帶、特殊、後果性或懲罰性損害負責。'
          : 'To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use or inability to use the Service.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '7. 條款修改' : '7. Changes to Terms'}</h3>
        <p>{isZhTW
          ? '我們保留隨時修改這些條款的權利。修改後繼續使用本服務即表示您接受新條款。'
          : 'We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '8. 聯繫方式' : '8. Contact'}</h3>
        <p>{isZhTW
          ? '如有任何問題，請聯繫我們：support@agent-flow-builder.com'
          : 'For any questions, please contact us at: support@agent-flow-builder.com'
        }</p>
      </div>
    </LegalModal>
  );
};

export const PrivacyPolicy: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language } = useTheme();
  const isZhTW = language === 'zh-TW';

  return (
    <LegalModal isOpen={isOpen} onClose={onClose} title={isZhTW ? '隱私政策' : 'Privacy Policy'}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">{isZhTW ? '最後更新：2026年1月18日' : 'Last updated: January 18, 2026'}</p>

        <h3 className="text-white font-semibold">{isZhTW ? '1. 資料收集' : '1. Information We Collect'}</h3>
        <p>{isZhTW
          ? '我們收集以下類型的資訊：(a) 帳戶資訊：當您註冊時，我們會收集您的電子郵件地址和姓名；(b) 使用數據：我們記錄您如何使用本服務；(c) 付款資訊：透過 Paddle 處理，我們不直接存儲您的付款卡資訊。'
          : 'We collect the following types of information: (a) Account information: email address and name when you register; (b) Usage data: how you use the Service; (c) Payment information: processed through Paddle, we do not directly store your payment card information.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '2. 資料使用' : '2. How We Use Your Information'}</h3>
        <p>{isZhTW
          ? '我們使用您的資訊來：(a) 提供和維護服務；(b) 處理交易；(c) 發送服務相關通知；(d) 改進我們的服務。'
          : 'We use your information to: (a) provide and maintain the Service; (b) process transactions; (c) send service-related notifications; (d) improve our Service.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '3. 資料分享' : '3. Information Sharing'}</h3>
        <p>{isZhTW
          ? '我們不會出售您的個人資訊。我們可能會與以下第三方分享資訊：(a) 服務提供商（如 Paddle 用於付款處理，Supabase 用於數據存儲）；(b) 法律要求時。'
          : 'We do not sell your personal information. We may share information with: (a) service providers (such as Paddle for payment processing, Supabase for data storage); (b) when required by law.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '4. 資料安全' : '4. Data Security'}</h3>
        <p>{isZhTW
          ? '我們採用行業標準的安全措施來保護您的資訊，包括加密傳輸和安全存儲。'
          : 'We use industry-standard security measures to protect your information, including encrypted transmission and secure storage.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '5. Cookie 使用' : '5. Cookies'}</h3>
        <p>{isZhTW
          ? '我們使用 Cookie 和類似技術來維持您的登入狀態和改善用戶體驗。'
          : 'We use cookies and similar technologies to maintain your login session and improve user experience.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '6. 您的權利' : '6. Your Rights'}</h3>
        <p>{isZhTW
          ? '您有權：(a) 訪問您的個人資料；(b) 更正不準確的資料；(c) 要求刪除您的資料；(d) 反對處理您的資料。'
          : 'You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion of your data; (d) object to processing of your data.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '7. 聯繫方式' : '7. Contact'}</h3>
        <p>{isZhTW
          ? '如有隱私相關問題，請聯繫：privacy@agent-flow-builder.com'
          : 'For privacy-related questions, please contact: privacy@agent-flow-builder.com'
        }</p>
      </div>
    </LegalModal>
  );
};

export const RefundPolicy: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language } = useTheme();
  const isZhTW = language === 'zh-TW';

  return (
    <LegalModal isOpen={isOpen} onClose={onClose} title={isZhTW ? '退款政策' : 'Refund Policy'}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">{isZhTW ? '最後更新：2026年1月18日' : 'Last updated: January 18, 2026'}</p>

        <h3 className="text-white font-semibold">{isZhTW ? '1. 一般政策' : '1. General Policy'}</h3>
        <p>{isZhTW
          ? '由於本服務提供的是數位產品（AI 生成服務），一旦點數被使用，相應費用將不予退還。'
          : 'As the Service provides digital products (AI generation services), once credits are used, the corresponding fees are non-refundable.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '2. 未使用點數' : '2. Unused Credits'}</h3>
        <p>{isZhTW
          ? '對於購買後 14 天內未使用的點數，您可以申請全額退款。超過 14 天的未使用點數將不予退款。'
          : 'For credits unused within 14 days of purchase, you may request a full refund. Unused credits after 14 days are non-refundable.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '3. 服務故障' : '3. Service Failures'}</h3>
        <p>{isZhTW
          ? '如果因我們的技術問題導致服務無法正常使用，且點數被扣除，我們將退還相應點數或提供等值補償。'
          : 'If technical issues on our end prevent normal service use and credits are deducted, we will refund the corresponding credits or provide equivalent compensation.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '4. 退款流程' : '4. Refund Process'}</h3>
        <p>{isZhTW
          ? '申請退款請聯繫 refund@agent-flow-builder.com，並提供：(a) 您的帳戶電子郵件；(b) 購買日期；(c) 退款原因。我們將在 5-10 個工作日內處理退款請求。'
          : 'To request a refund, contact refund@agent-flow-builder.com with: (a) your account email; (b) purchase date; (c) reason for refund. We will process refund requests within 5-10 business days.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '5. 退款方式' : '5. Refund Method'}</h3>
        <p>{isZhTW
          ? '退款將退回至您原始的付款方式。退款處理時間取決於您的銀行或付款提供商。'
          : 'Refunds will be returned to your original payment method. Processing time depends on your bank or payment provider.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '6. 例外情況' : '6. Exceptions'}</h3>
        <p>{isZhTW
          ? '以下情況不符合退款條件：(a) 違反服務條款導致的帳戶終止；(b) 對服務品質的主觀不滿（如對 AI 生成結果不滿意）；(c) 促銷或折扣購買的點數。'
          : 'The following are not eligible for refunds: (a) account termination due to terms of service violations; (b) subjective dissatisfaction with service quality (e.g., dissatisfaction with AI-generated results); (c) credits purchased during promotions or at discounted prices.'
        }</p>

        <h3 className="text-white font-semibold">{isZhTW ? '7. 聯繫方式' : '7. Contact'}</h3>
        <p>{isZhTW
          ? '退款相關問題，請聯繫：refund@agent-flow-builder.com'
          : 'For refund-related questions, please contact: refund@agent-flow-builder.com'
        }</p>
      </div>
    </LegalModal>
  );
};
