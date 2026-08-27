import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type Kind = 'ok' | 'err' | 'info';
interface ToastItem { id: number; msg: string; kind: Kind; }

const ToastCtx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, kind: Kind = 'info') => {
    const id = ++seq;
    setItems((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] space-y-2 w-80 max-w-[90vw] no-print">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 shadow-xl text-sm text-white animate-[fadeIn_.15s_ease-out] ${
              t.kind === 'ok' ? 'bg-emerald-600' : t.kind === 'err' ? 'bg-red-600' : 'bg-slate-800 border border-slate-600'
            }`}
          >
            {t.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : t.kind === 'err' ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
