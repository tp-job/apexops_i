import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GatewayTimeout: FC = () => {
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const reloadPage = () => {
        window.location.reload();
    };

    const goHome = () => {
        navigate('/');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <div className="text-center px-4 max-w-2xl mx-auto">
                {/* 504 Number with Animation */}
                <div className="relative mb-8">
                    <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-global-yellow via-orange-primary to-global-red animate-pulse">
                        504
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 md:w-96 md:h-96 bg-orange-primary/20 dark:bg-orange-primary/10 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        Gateway Timeout
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
                        The server took too long to respond. This might be due to network issues or server overload.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-10 flex justify-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                        <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Clock/Timer Icon */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="60" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                fill="currentColor" 
                                className="text-global-yellow/20 dark:text-global-yellow/10"
                            />
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="50" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeDasharray="8 4" 
                                className="text-global-yellow/40"
                            />

                            {/* Clock hands */}
                            <line 
                                x1="100" 
                                y1="100" 
                                x2="100" 
                                y2="65" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                strokeLinecap="round" 
                                className="text-orange-primary animate-spin" 
                                style={{ transformOrigin: '100px 100px', animationDuration: '2s' }} 
                            />
                            <line 
                                x1="100" 
                                y1="100" 
                                x2="125" 
                                y2="100" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                className="text-orange-primary"
                            />

                            {/* Clock center */}
                            <circle cx="100" cy="100" r="5" fill="currentColor" className="text-orange-primary" />

                            {/* Hour markers */}
                            <circle cx="100" cy="50" r="3" fill="currentColor" className="text-global-yellow" />
                            <circle cx="100" cy="150" r="3" fill="currentColor" className="text-global-yellow" />
                            <circle cx="50" cy="100" r="3" fill="currentColor" className="text-global-yellow" />
                            <circle cx="150" cy="100" r="3" fill="currentColor" className="text-global-yellow" />

                            {/* Warning symbol */}
                            <path 
                                d="M100 25 L110 15 L120 25" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                fill="none" 
                                className="text-global-red animate-bounce"
                            />
                        </svg>
                    </div>
                </div>

                {/* Elapsed Time Counter */}
                <div className="mb-6">
                    <div className="inline-block bg-orange-primary/10 dark:bg-orange-primary/20 border border-orange-primary/30 dark:border-orange-primary/40 rounded-xl px-6 py-4">
                        <p className="text-orange-primary dark:text-orange-primary text-sm font-medium mb-1">
                            Time waited
                        </p>
                        <p className="text-orange-primary dark:text-orange-primary text-4xl font-bold font-mono">
                            {formatTime(elapsed)}
                        </p>
                    </div>
                </div>

                {/* Technical Info */}
                <div className="mb-6">
                    <div className="inline-block bg-global-yellow/10 dark:bg-global-yellow/20 border border-global-yellow/30 dark:border-global-yellow/40 rounded-xl px-5 py-2.5">
                        <p className="text-global-yellow dark:text-global-yellow text-sm font-mono font-semibold">
                            Error Code: 504 - Gateway Timeout
                        </p>
                    </div>
                </div>

                {/* Possible Causes */}
                <div className="mb-6 max-w-md mx-auto">
                    <div className="bg-light-surface dark:bg-dark-surface rounded-xl shadow-sm border border-light-border dark:border-dark-border p-5">
                        <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                            Possible causes:
                        </h3>
                        <ul className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-left space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-orange-primary mt-0.5">•</span>
                                <span>Server is experiencing high load</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-primary mt-0.5">•</span>
                                <span>Network connection is slow or unstable</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-primary mt-0.5">•</span>
                                <span>Upstream server is not responding</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3.5 bg-gradient-to-r from-global-yellow to-orange-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Retry Request
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
                        Still having issues?{' '}
                        <a href="/contact" className="text-orange-primary hover:text-orange-600 dark:hover:text-orange-400 underline transition-colors">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GatewayTimeout;
