import type { FC } from 'react';

interface LoadingSpinnerProps {
    /** Optional message to display below spinner */
    message?: string;
    /** Size variant: 'sm' | 'md' | 'lg' */
    size?: 'sm' | 'md' | 'lg';
    /** Full screen overlay or inline */
    fullScreen?: boolean;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
    message = 'Please wait while we prepare your content',
    size = 'md',
    fullScreen = true 
}) => {
    const sizeClasses = {
        sm: { spinner: 'w-8 h-8', inner: 'w-4 h-4', text: 'text-sm' },
        md: { spinner: 'w-16 h-16', inner: 'w-8 h-8', text: 'text-base' },
        lg: { spinner: 'w-24 h-24', inner: 'w-12 h-12', text: 'text-lg' },
    };

    const { spinner, inner, text } = sizeClasses[size];

    const content = (
        <div className="text-center">
            {/* Spinner */}
            <div className="relative inline-block">
                <div className={`${spinner} border-4 border-global-blue/20 border-t-orange-primary rounded-full animate-spin`}></div>
                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}>
                    <div className={`${inner} border-4 border-transparent border-t-orange-primary/60 rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
                </div>
            </div>

            {/* Loading Text */}
            {message && (
                <div className="mt-6">
                    <h2 className={`${text} font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary`}>
                        Loading...
                    </h2>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {message}
                    </p>
                </div>
            )}

            {/* Animated Dots */}
            <div className="flex justify-center items-center gap-2 mt-4">
                <div className="w-2 h-2 bg-orange-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-orange-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-orange-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
                {content}
            </div>
        );
    }

    return <div className="flex items-center justify-center py-8">{content}</div>;
};

export default LoadingSpinner;
