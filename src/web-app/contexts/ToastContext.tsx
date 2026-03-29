import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, 3000);

    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const typeConfig: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
    success: { bar: 'bg-teal-500', icon: <CheckCircle size={16} className="text-teal-600" /> },
    error: { bar: 'bg-rose-500', icon: <XCircle size={16} className="text-rose-600" /> },
    info: { bar: 'bg-amber-500', icon: <Info size={16} className="text-amber-600" /> },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((toast) => {
            const config = typeConfig[toast.type];
            return (
              <div
                key={toast.id}
                className="pointer-events-auto animate-[toastIn_200ms_ease-out] bg-white border border-stone-200 shadow-xl rounded-2xl px-5 py-3 text-sm font-medium text-stone-700 flex items-center gap-3 min-w-[200px] max-w-[400px]"
              >
                <div className={`w-1 h-8 rounded-full ${config.bar} shrink-0`} />
                {config.icon}
                <span className="flex-1">{toast.message}</span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
