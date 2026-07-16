import { CheckCircle2 } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import styles from './Toast.module.css';

interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<{ show: (message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={styles.stack}>
        {toasts.map((t) => (
          <div className={styles.toast} key={t.id}>
            <CheckCircle2 size={18} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
