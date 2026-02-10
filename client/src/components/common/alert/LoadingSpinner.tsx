import type { FC } from 'react';

const LoadingSpinner: FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg">
            <div className="text-center">
                {/* Spinner */}
                <div className="relative inline-block">
                    <div className="w-16 h-16 border-4 border-global-blue/20 border-t-ember rounded-full animate-spin"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-8 h-8 border-4 border-transparent border-t-ember/60 rounded-full animate-spin"></div>
                    </div>
                </div>

                {/* Loading Text */}
                <div className="mt-6">
                    <h2 className="text-2xl font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary">
                        Loading...
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        Please wait while we prepare your content
                    </p>
                </div>

                {/* Animated Dots */}
                <div className="flex justify-center items-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-ember rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-ember rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-ember rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
