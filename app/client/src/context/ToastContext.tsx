import { useCallback, useState, type ReactNode } from 'react';
import Toast from '@/components/common/alert/Toast';
import { ToastContext, type ToastContextValue } from './toast-context';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const show = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
    }, []);

    const value: ToastContextValue = {
        showSuccess: (msg) => show(msg, 'success'),
        showError: (msg) => show(msg, 'error'),
        showInfo: (msg) => show(msg, 'info'),
        showWarning: (msg) => show(msg, 'warning'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                    duration={4000}
                    showClose
                />
            )}
        </ToastContext.Provider>
    );
}
