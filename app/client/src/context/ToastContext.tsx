import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Toast from '@/components/common/alert/Toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextValue {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

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

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
