import { type FC, useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast: FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const typeClasses = {
        success: {
            bg: 'bg-green-500',
            icon: 'ri-check-line',
        },
        error: {
            bg: 'bg-red-500',
            icon: 'ri-error-warning-line',
        },
        info: {
            bg: 'bg-blue-500',
            icon: 'ri-information-line',
        },
    };

    const { bg, icon } = typeClasses[type];

    return (
        <div className={`fixed bottom-6 right-6 z-50 ${bg} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up`}>
            <i className={`${icon} text-xl`}></i>
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70">
                <i className="ri-close-line"></i>
            </button>
        </div>
    );
};

export default Toast;
