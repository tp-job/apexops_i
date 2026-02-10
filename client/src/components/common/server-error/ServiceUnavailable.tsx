import type { FC } from 'react'
import { useState, useEffect } from 'react';

const ServiceUnavailable: FC = () => {
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
        window.location.href = '/';
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="text-center px-4">
                {/* 503 Number with Animation */}
                <div className="relative">
                    <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo to-wine animate-pulse">
                        503
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-6">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-3">
                        Service Unavailable
                    </h2>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                        Our service is temporarily unavailable due to maintenance or high traffic. We'll be back soon!
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-8">
                    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Maintenance Icon */}
                        <circle cx="100" cy="100" r="60" stroke="#3B82F6" strokeWidth="4" fill="#DBEAFE" />

                        {/* Wrench */}
                        <path d="M85 75 L75 85 L90 100 L100 90 Z" fill="#2563EB" />
                        <rect x="88" y="98" width="8" height="30" transform="rotate(45 92 113)" fill="#2563EB" />

                        {/* Gear */}
                        <circle cx="120" cy="115" r="15" stroke="#2563EB" strokeWidth="3" fill="#DBEAFE" />
                        <circle cx="120" cy="115" r="8" fill="#2563EB" />
                        <rect x="118" y="100" width="4" height="8" fill="#2563EB" />
                        <rect x="118" y="122" width="4" height="8" fill="#2563EB" />
                        <rect x="105" y="113" width="8" height="4" fill="#2563EB" />
                        <rect x="127" y="113" width="8" height="4" fill="#2563EB" />

                        {/* Rotating circle indicator */}
                        <circle cx="100" cy="100" r="70" stroke="#3B82F6" strokeWidth="2" strokeDasharray="5 5" className="animate-spin" style={{ animationDuration: '3s' }} />
                    </svg>
                </div>

                {/* Countdown Timer */}
                <div className="mb-6">
                    <div className="inline-block bg-blue-100 border border-blue-300 rounded-lg px-6 py-3">
                        <p className="text-blue-700 text-sm font-medium mb-1">
                            Auto-retry in
                        </p>
                        <p className="text-blue-900 text-3xl font-bold">
                            {countdown}s
                        </p>
                    </div>
                </div>

                {/* Status Message */}
                <div className="mb-6">
                    <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        <p className="text-yellow-700 text-sm font-mono">
                            Status: Maintenance Mode
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3 bg-gradient-to-r from-indigo to-wine text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Try Again Now
                    </button>
                    <button
                        onClick={goHome}
                        className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg border-2 border-gray-200 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Go Home
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-12">
                    <p className="text-gray-500 text-sm">
                        Check our{' '}
                        <a href="/status" className="text-ember hover:text-wine underline">
                            status page
                        </a>
                        {' '}for updates
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ServiceUnavailable