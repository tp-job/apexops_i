import { type FC, useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    /** Auto-close duration in ms (default 3000) */
    duration?: number;
    /** Show close button */
    showClose?: boolean;
}

const Toast: FC<ToastProps> = ({ 
    message, 
    type, 
    onClose, 
    duration = 3000,
    showClose = true 
}) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const typeClasses = {
        success: {
            bg: 'bg-global-green/90 dark:bg-global-green/80',
            border: 'border-global-green/30',
            icon: 'ri-check-line',
            iconBg: 'bg-global-green/20',
        },
        error: {
            bg: 'bg-global-red/90 dark:bg-global-red/80',
            border: 'border-global-red/30',
            icon: 'ri-error-warning-line',
            iconBg: 'bg-global-red/20',
        },
        warning: {
            bg: 'bg-global-yellow/90 dark:bg-global-yellow/80',
            border: 'border-global-yellow/30',
            icon: 'ri-alert-line',
            iconBg: 'bg-global-yellow/20',
        },
        info: {
            bg: 'bg-blue-primary/90 dark:bg-blue-primary/80',
            border: 'border-blue-primary/30',
            icon: 'ri-information-line',
            iconBg: 'bg-blue-primary/20',
        },
    };

    const { bg, border, icon, iconBg } = typeClasses[type];

    return (
        <div 
            className={`fixed bottom-6 right-6 z-50 ${bg} backdrop-blur-md text-white px-5 py-3.5 rounded-xl shadow-2xl border ${border} flex items-center gap-3 animate-slide-in-right min-w-[280px] max-w-md`}
            role="alert"
        >
            {/* Icon */}
            <div className={`${iconBg} p-1.5 rounded-lg flex-shrink-0`}>
                <i className={`${icon} text-lg`}></i>
            </div>
            
            {/* Message */}
            <span className="font-medium flex-1 text-sm leading-relaxed">{message}</span>
            
            {/* Close Button */}
            {showClose && (
                <button 
                    onClick={onClose} 
                    className="ml-2 hover:opacity-70 transition-opacity p-1 rounded-md hover:bg-white/10 flex-shrink-0"
                    aria-label="Close"
                >
                    <i className="ri-close-line text-lg"></i>
                </button>
            )}
        </div>
    );
};

export default Toast;
