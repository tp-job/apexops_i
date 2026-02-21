import { type FC, useEffect } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isConfirming?: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    icon?: string;
    iconBgColor?: string;
    iconColor?: string;
    confirmBtnColor?: string;
    /** Variant: 'danger' | 'warning' | 'info' */
    variant?: 'danger' | 'warning' | 'info';
    /** Show backdrop blur */
    backdropBlur?: boolean;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isConfirming = false,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon,
    iconBgColor,
    iconColor,
    confirmBtnColor,
    variant = 'info',
    backdropBlur = true,
}) => {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isConfirming) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, isConfirming, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: icon || 'ri-error-warning-line',
            iconBg: iconBgColor || 'bg-global-red/10 dark:bg-global-red/20',
            iconColor: iconColor || 'text-global-red',
            confirmBtn: confirmBtnColor || 'bg-global-red hover:bg-red-600 dark:bg-global-red dark:hover:bg-red-700',
        },
        warning: {
            icon: icon || 'ri-alert-line',
            iconBg: iconBgColor || 'bg-global-yellow/10 dark:bg-global-yellow/20',
            iconColor: iconColor || 'text-global-yellow',
            confirmBtn: confirmBtnColor || 'bg-orange-primary hover:bg-orange-600 dark:bg-orange-primary dark:hover:bg-orange-600',
        },
        info: {
            icon: icon || 'ri-information-line',
            iconBg: iconBgColor || 'bg-blue-primary/10 dark:bg-blue-primary/20',
            iconColor: iconColor || 'text-blue-primary',
            confirmBtn: confirmBtnColor || 'bg-blue-primary hover:bg-blue-secondary dark:bg-blue-primary dark:hover:bg-blue-secondary',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center ${backdropBlur ? 'backdrop-blur-sm' : ''} bg-black/50 dark:bg-black/70 transition-opacity duration-300`}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isConfirming) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-light-border dark:border-dark-border transform transition-all duration-300 scale-100 animate-modal-in">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className={`size-12 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`${styles.icon} text-2xl ${styles.iconColor}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="modal-title" className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            This action may not be reversible
                        </p>
                    </div>
                    {!isConfirming && (
                        <button
                            onClick={onClose}
                            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 p-1.5 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Close"
                        >
                            <i className="ri-close-line text-xl"></i>
                        </button>
                    )}
                </div>

                {/* Message */}
                <div className="text-light-text dark:text-dark-text mb-6 leading-relaxed">
                    {message}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isConfirming}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={`px-6 py-2.5 rounded-xl text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg ${styles.confirmBtn}`}
                    >
                        {isConfirming ? (
                            <>
                                <i className="ri-loader-4-line animate-spin"></i>
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
