'use client';

import { createContext, useCallback, useContext, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => number;
  dismiss: (id: number) => void;
  resolveLoading: (id: number, success: boolean, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const DURATION = 4000;

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  loading: <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />,
};

const BORDER: Record<ToastType, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  loading: 'border-blue-500/30',
};

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    timers.current.get(id) && clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, duration = DURATION) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      if (duration) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback((m: string) => push('success', m), [push]);
  const error = useCallback((m: string) => push('error', m, 6000), [push]);
  const info = useCallback((m: string) => push('info', m), [push]);
  const loading = useCallback((m: string) => push('loading', m, 0), [push]);

  const resolveLoading = useCallback(
    (id: number, ok: boolean, message?: string) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, type: ok ? 'success' : 'error', message: message || t.message } : t)));
      const timer = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ success, error, info, loading, dismiss, resolveLoading }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2.5 w-[320px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-slate-900 border ${BORDER[t.type]} rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200`}
          >
            {ICONS[t.type]}
            <span className="text-xs font-medium text-slate-100 flex-1 leading-relaxed">{t.message}</span>
            {t.type !== 'loading' && (
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-500 hover:text-white transition shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}