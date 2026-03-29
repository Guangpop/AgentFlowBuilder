import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, MousePointer, ArrowRight, Zap, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onClose: () => void;
  onLoadExample?: () => void;
}

const STORAGE_KEY = 'agentflow-welcomed';

export function useWelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  return { show, dismiss };
}

const WelcomeModal: React.FC<Props> = ({ onClose, onLoadExample }) => {
  const { t } = useTheme();
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: 'AgentFlow Builder',
      subtitle: (t as any).welcomeSubtitle || 'Design AI Agent workflows with ease',
      icon: <Sparkles size={48} className="text-teal-500" />,
    },
    {
      title: (t as any).welcomeStep1 || 'Add Nodes',
      subtitle: '',
      steps: [
        { icon: <MousePointer size={24} />, label: (t as any).welcomeStep1 || 'Add Nodes', desc: (t as any).welcomeStep1Desc || '' },
        { icon: <ArrowRight size={24} />, label: (t as any).welcomeStep2 || 'Connect Flow', desc: (t as any).welcomeStep2Desc || '' },
        { icon: <Zap size={24} />, label: (t as any).welcomeStep3 || 'Generate Skills', desc: (t as any).welcomeStep3Desc || '' },
      ],
    },
    {
      title: (t as any).getStarted || 'Get Started',
      subtitle: '',
      final: true,
    },
  ];

  const isLast = step === slides.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="max-w-lg w-[90%] bg-white rounded-3xl shadow-2xl p-8 relative">
        {/* Skip button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sm text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center space-y-6 py-4">
          {slides[step].icon && (
            <div className="flex justify-center">
              <div className="p-4 bg-teal-50 rounded-3xl">
                {slides[step].icon}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-stone-800">{slides[step].title}</h2>

          {slides[step].subtitle && (
            <p className="text-stone-500 text-base">{slides[step].subtitle}</p>
          )}

          {slides[step].steps && (
            <div className="flex justify-center gap-4 mt-4">
              {slides[step].steps!.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-2xl w-[140px]">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="text-stone-400">{s.icon}</div>
                  <span className="text-sm font-semibold text-stone-700">{s.label}</span>
                  {s.desc && <span className="text-[10px] text-stone-400 leading-relaxed">{s.desc}</span>}
                </div>
              ))}
            </div>
          )}

          {slides[step].final && (
            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-base font-semibold transition-all cursor-pointer active:scale-[0.97]"
              >
                {(t as any).getStarted || 'Get Started'}
              </button>
              {onLoadExample && (
                <button
                  onClick={() => { onLoadExample(); onClose(); }}
                  className="text-sm text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                >
                  {(t as any).loadExample || 'Load Example'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dots + Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${step === 0 ? 'opacity-0 pointer-events-none' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-teal-600' : 'bg-stone-200'}`}
              />
            ))}
          </div>

          {!isLast ? (
            <button
              onClick={() => setStep(s => Math.min(slides.length - 1, s + 1))}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          ) : (
            <div className="w-9" /> // spacer
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WelcomeModal;
