import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const ServerError: FC = () => {
    const navigate = useNavigate();

    const reloadPage = () => {
        window.location.reload();
    };

    const goHome = () => {
        navigate('/');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <div className="text-center px-4 max-w-2xl mx-auto">
                {/* 500 Number with Animation */}
                <div className="relative mb-8">
                    <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-global-red via-orange-primary to-yellow-500 animate-pulse">
                        500
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 md:w-96 md:h-96 bg-global-red/20 dark:bg-global-red/10 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        Internal Server Error
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
                        Oops! Something went wrong on our end. We're working to fix the issue. Please try again later.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-10 flex justify-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                        <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Server Icon with Error */}
                            <rect 
                                x="50" 
                                y="60" 
                                width="100" 
                                height="80" 
                                rx="8" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                fill="currentColor" 
                                className="text-global-red/20 dark:text-global-red/10"
                            />
                            <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />
                            <line x1="60" y1="100" x2="140" y2="100" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />
                            <line x1="60" y1="120" x2="140" y2="120" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />

                            {/* Error Symbol */}
                            <circle cx="100" cy="100" r="25" fill="currentColor" className="text-global-red" opacity="0.9" />
                            <line x1="100" y1="90" x2="100" y2="105" stroke="white" strokeWidth="4" strokeLinecap="round" />
                            <circle cx="100" cy="112" r="2" fill="white" />

                            {/* Warning indicators */}
                            <circle cx="70" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" />
                            <circle cx="100" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <circle cx="130" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </svg>
                    </div>
                </div>

                {/* Error Code */}
                <div className="mb-6">
                    <div className="inline-block bg-global-red/10 dark:bg-global-red/20 border border-global-red/30 dark:border-global-red/40 rounded-xl px-5 py-2.5">
                        <p className="text-global-red dark:text-global-red text-sm font-mono font-semibold">
                            Error Code: 500 - Internal Server Error
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3.5 bg-gradient-to-r from-global-red to-orange-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={goHome}
                        className="px-8 py-3.5 bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary font-semibold rounded-xl shadow-md hover:shadow-lg border-2 border-light-border dark:border-dark-border transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Go Home
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-12">
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                        If the problem persists, please{' '}
                        <a href="/contact" className="text-global-red hover:text-red-600 dark:hover:text-red-400 underline transition-colors">
                            contact support
                        </a>
                    </p>
                </div>

                {/* Status Message */}
                <div className="mt-6">
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-xs">
                        Our team has been notified and is investigating the issue.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServerError;
