import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const styles: Record<ToastKind, { wrap: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  error: { wrap: 'border-red-200 bg-red-50 text-red-900', icon: CircleAlert },
  info: { wrap: 'border-blue-200 bg-blue-50 text-blue-900', icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="no-print fixed bottom-5 right-5 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2">
        {items.map((item) => {
          const style = styles[item.kind];
          const Icon = style.icon;
          return (
            <div key={item.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${style.wrap}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{item.message}</span>
              <button onClick={() => dismiss(item.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
