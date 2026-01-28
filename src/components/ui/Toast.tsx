import { useEffect, useState, type ReactNode } from 'react';
import { ToastContext } from '../../hooks/useToast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const styles = {
    success: 'bg-success',
    error: 'bg-destructive',
    info: 'bg-info',
    warning: 'bg-warning',
  };

  const icons = {
    success: <span className="material-icons text-xl">check_circle</span>,
    error: <span className="material-icons text-xl">error</span>,
    info: <span className="material-icons text-xl">info</span>,
    warning: <span className="material-icons text-xl">warning</span>,
  };

  return (
    <div
      className={`${styles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}
    >
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onRemove} className="hover:opacity-80">
        <span className="material-icons text-lg">close</span>
      </button>
    </div>
  );
}
