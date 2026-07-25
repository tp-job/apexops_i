import { createContext, useContext } from 'react';

/** Split from `ToastContext.tsx` — see `auth-context.ts` for why. */
export interface ToastContextValue {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
