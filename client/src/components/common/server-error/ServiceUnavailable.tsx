import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceUnavailable: FC = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(30);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    window.location.reload();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const reloadPage = () => {
        window.location.reload();
    };

    const goHome = () => {
        navigate('/');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <div className="text-center px-4 max-w-2xl mx-auto">
                {/* 503 Number with Animation */}
                <div className="relative mb-8">
                    <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-primary via-orange-primary to-blue-secondary animate-pulse">
                        503
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 md:w-96 md:h-96 bg-blue-primary/20 dark:bg-blue-primary/10 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        Service Unavailable
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
                        Our service is temporarily unavailable due to maintenance or high traffic. We'll be back soon!
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-10 flex justify-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                        <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Maintenance Icon */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="60" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                fill="currentColor" 
                                className="text-blue-primary/20 dark:text-blue-primary/10"
                            />

                            {/* Wrench */}
                            <path d="M85 75 L75 85 L90 100 L100 90 Z" fill="currentColor" className="text-blue-primary" />
                            <rect x="88" y="98" width="8" height="30" transform="rotate(45 92 113)" fill="currentColor" className="text-blue-primary" />

                            {/* Gear */}
                            <circle cx="120" cy="115" r="15" stroke="currentColor" strokeWidth="3" fill="currentColor" className="text-blue-primary/20 dark:text-blue-primary/10" />
                            <circle cx="120" cy="115" r="8" fill="currentColor" className="text-blue-primary" />
                            <rect x="118" y="100" width="4" height="8" fill="currentColor" className="text-blue-primary" />
                            <rect x="118" y="122" width="4" height="8" fill="currentColor" className="text-blue-primary" />
                            <rect x="105" y="113" width="8" height="4" fill="currentColor" className="text-blue-primary" />
                            <rect x="127" y="113" width="8" height="4" fill="currentColor" className="text-blue-primary" />

                            {/* Rotating circle indicator */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="70" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeDasharray="5 5" 
                                className="text-blue-primary/30 animate-spin" 
                                style={{ animationDuration: '3s' }} 
                            />
                        </svg>
                    </div>
                </div>

                {/* Countdown Timer */}
                <div className="mb-6">
                    <div className="inline-block bg-blue-primary/10 dark:bg-blue-primary/20 border border-blue-primary/30 dark:border-blue-primary/40 rounded-xl px-6 py-4">
                        <p className="text-blue-primary dark:text-blue-primary text-sm font-medium mb-1">
                            Auto-retry in
                        </p>
                        <p className="text-blue-primary dark:text-blue-primary text-4xl font-bold font-mono">
                            {countdown}s
                        </p>
                    </div>
                </div>

                {/* Status Message */}
                <div className="mb-6">
                    <div className="inline-flex items-center gap-2 bg-global-yellow/10 dark:bg-global-yellow/20 border border-global-yellow/30 dark:border-global-yellow/40 rounded-xl px-4 py-2.5">
                        <div className="w-2 h-2 bg-global-yellow rounded-full animate-pulse"></div>
                        <p className="text-global-yellow dark:text-global-yellow text-sm font-mono font-semibold">
                            Status: Maintenance Mode
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-primary to-orange-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Try Again Now
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
                        Check our{' '}
                        <a href="/status" className="text-orange-primary hover:text-blue-primary underline transition-colors">
                            status page
                        </a>
                        {' '}for updates
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServiceUnavailable;
