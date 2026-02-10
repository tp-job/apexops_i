import type { FC } from 'react'
import { useState, useEffect } from 'react';

const GatewayTimeout: FC = () => {
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
        window.location.href = '/';
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
            <div className="text-center px-4">
                {/* 504 Number with Animation */}
                <div className="relative">
                    <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 animate-pulse">
                        504
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-6">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-3">
                        Gateway Timeout
                    </h2>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                        The server took too long to respond. This might be due to network issues or server overload.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-8">
                    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Clock/Timer Icon */}
                        <circle cx="100" cy="100" r="60" stroke="#F59E0B" strokeWidth="4" fill="#FEF3C7" />
                        <circle cx="100" cy="100" r="50" stroke="#F59E0B" strokeWidth="2" strokeDasharray="8 4" />

                        {/* Clock hands */}
                        <line x1="100" y1="100" x2="100" y2="65" stroke="#D97706" strokeWidth="4" strokeLinecap="round" className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '2s' }} />
                        <line x1="100" y1="100" x2="125" y2="100" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />

                        {/* Clock center */}
                        <circle cx="100" cy="100" r="5" fill="#D97706" />

                        {/* Hour markers */}
                        <circle cx="100" cy="50" r="3" fill="#F59E0B" />
                        <circle cx="100" cy="150" r="3" fill="#F59E0B" />
                        <circle cx="50" cy="100" r="3" fill="#F59E0B" />
                        <circle cx="150" cy="100" r="3" fill="#F59E0B" />

                        {/* Warning symbol */}
                        <path d="M100 25 L110 15 L120 25" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-bounce" />
                    </svg>
                </div>

                {/* Elapsed Time Counter */}
                <div className="mb-6">
                    <div className="inline-block bg-orange-100 border border-orange-300 rounded-lg px-6 py-3">
                        <p className="text-orange-700 text-sm font-medium mb-1">
                            Time waited
                        </p>
                        <p className="text-orange-900 text-3xl font-bold font-mono">
                            {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                        </p>
                    </div>
                </div>

                {/* Technical Info */}
                <div className="mb-6">
                    <div className="inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        <p className="text-amber-700 text-sm font-mono">
                            Error Code: 504 - Gateway Timeout
                        </p>
                    </div>
                </div>

                {/* Possible Causes */}
                <div className="mb-6 max-w-md mx-auto">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Possible causes:</h3>
                        <ul className="text-sm text-gray-600 text-left space-y-1">
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <span>Server is experiencing high load</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <span>Network connection is slow or unstable</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-orange-500 mt-0.5">•</span>
                                <span>Upstream server is not responding</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Retry Request
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
                        Still having issues?{' '}
                        <a href="/contact" className="text-orange-600 hover:text-orange-700 underline">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default GatewayTimeout