'use client';

import { createContext, useCallback, useContext, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
  isExiting?: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string, duration?: number) => void;
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

const ICON_CONTAINERS: Record<ToastType, React.ReactNode> = {
  success: (
    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
      <CheckCircle2 className="w-5 h-5" />
    </div>
  ),
  error: (
    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
      <AlertCircle className="w-5 h-5" />
    </div>
  ),
  info: (
    <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/10">
      <Info className="w-5 h-5" />
    </div>
  ),
  loading: (
    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  ),
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-slate-900/90 shadow-2xl shadow-emerald-950/40 ring-1 ring-emerald-500/20',
  error: 'border-rose-500/30 bg-slate-900/90 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/20',
  info: 'border-sky-500/30 bg-slate-900/90 shadow-2xl shadow-sky-950/40 ring-1 ring-sky-500/20',
  loading: 'border-indigo-500/30 bg-slate-900/90 shadow-2xl shadow-indigo-950/40 ring-1 ring-indigo-500/20',
};

const ACCENT_GRADIENT: Record<ToastType, string> = {
  success: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  error: 'bg-gradient-to-r from-rose-500 to-red-400',
  info: 'bg-gradient-to-r from-sky-500 to-blue-400',
  loading: 'bg-gradient-to-r from-indigo-500 to-purple-400',
};

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    timers.current.get(id) && clearTimeout(timers.current.get(id));
    timers.current.delete(id);

    // Trigger smooth fade-out & shrink transition
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
    );

    // Unmount after 500ms transition finishes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 500);
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, duration = DURATION) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message, isExiting: false }]);
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
  const info = useCallback((m: string, duration?: number) => push('info', m, duration), [push]);
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
      <div className="fixed top-12 right-6 z-[9999] flex flex-col gap-3.5 w-[420px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto relative overflow-hidden backdrop-blur-2xl border ${TOAST_STYLES[t.type]} rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-500 ease-out ${
              t.isExiting
                ? 'opacity-0 scale-90 translate-x-8 blur-sm'
                : 'opacity-100 scale-100 translate-x-0 animate-in slide-in-from-top-6 fade-in duration-300'
            }`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${ACCENT_GRADIENT[t.type]}`} />
            {ICON_CONTAINERS[t.type]}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-sm font-semibold text-white leading-snug tracking-wide">{t.message}</p>
            </div>
            {t.type !== 'loading' && (
              <button
                onClick={() => dismiss(t.id)}
                className="w-7 h-7 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer border border-slate-700/50"
                title="Dismiss"
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