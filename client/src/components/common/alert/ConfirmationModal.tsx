import { type FC } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isConfirming: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    icon?: string;
    iconBgColor?: string;
    iconColor?: string;
    confirmBtnColor?: string;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isConfirming,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon = 'ri-question-line',
    iconBgColor = 'bg-gray-100 dark:bg-gray-900/30',
    iconColor = 'text-gray-500',
    confirmBtnColor = 'bg-blue-500 hover:bg-blue-600',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-light-border dark:border-dark-border">
                <div className="flex items-center gap-4 mb-4">
                    <div className={`size-12 rounded-full ${iconBgColor} flex items-center justify-center`}>
                        <i className={`${icon} text-2xl ${iconColor}`}></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{title}</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">This action may not be reversible</p>
                    </div>
                </div>
                <div className="text-light-text dark:text-dark-text mb-6">
                    {message}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-colors"
                        disabled={isConfirming}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={`px-6 py-2 rounded-xl text-white transition-colors flex items-center gap-2 disabled:opacity-50 ${confirmBtnColor}`}
                    >
                        {isConfirming ? (
                            <>
                                <i className="ri-loader-4-line animate-spin"></i>
                                Processing...
                            </>
                        ) : (
                            <>
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
