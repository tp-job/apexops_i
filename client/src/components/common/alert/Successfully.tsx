import type { FC } from 'react';

interface SuccessfullyProps {
    /** Main success message */
    title?: string;
    /** Optional description */
    description?: string;
    /** Auto-close duration in ms (0 = no auto-close) */
    autoClose?: number;
    /** Callback when alert is closed */
    onClose?: () => void;
    /** Show close button */
    showClose?: boolean;
}

const Successfully: FC<SuccessfullyProps> = ({
    title = 'Done successfully :)',
    description = 'Your action has been completed successfully.',
    autoClose = 0,
    onClose,
    showClose = true,
}) => {
    // Auto-close if enabled
    if (autoClose > 0 && onClose) {
        setTimeout(onClose, autoClose);
    }

    return (
        <div className="flex flex-col gap-2 w-full max-w-sm text-sm z-50 animate-slide-in-right">
            <div className="success-alert cursor-default flex items-center justify-between w-full min-h-[3.5rem] rounded-xl bg-light-surface dark:bg-dark-surface px-4 py-3 shadow-lg border border-global-green/20 dark:border-global-green/30 backdrop-blur-sm">
                <div className="flex gap-3 items-start flex-1">
                    {/* Icon */}
                    <div className="text-global-green bg-global-green/10 dark:bg-global-green/20 backdrop-blur-xl p-2 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-light-text-primary dark:text-dark-text-primary font-semibold mb-0.5">
                            {title}
                        </p>
                        {description && (
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-xs leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Close Button */}
                {showClose && onClose && (
                    <button
                        onClick={onClose}
                        className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 p-1.5 rounded-md transition-colors ease-linear flex-shrink-0 ml-2"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Successfully;
