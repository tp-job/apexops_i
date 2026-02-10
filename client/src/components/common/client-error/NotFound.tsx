import type { FC } from 'react'

const NotFound: FC = () => {
    const goHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg">
            <div className="text-center px-4">
                {/* 404 Number with Animation */}
                <div className="relative">
                    <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-pink animate-pulse">
                        404
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 bg-neon-purple/20 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-6">
                    <h2 className="text-3xl font-semibold mb-3 text-light-text-primary dark:text-dark-text-primary">
                        Page Not Found
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg max-w-md mx-auto">
                        Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-8">
                    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Broken Link Icon */}
                        <circle cx="100" cy="100" r="80" stroke="#E5E7EB" strokeWidth="8" strokeDasharray="15 10" className="animate-spin" style={{ animationDuration: '20s' }} />
                        <path d="M70 80 L85 95 M85 95 L70 110" stroke="#9333EA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M130 80 L115 95 M115 95 L130 110" stroke="#9333EA" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="100" cy="130" r="3" fill="#9333EA" />
                        <circle cx="90" cy="140" r="2" fill="#DB2777" />
                        <circle cx="110" cy="140" r="2" fill="#DB2777" />
                    </svg>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={goHome}
                        className="px-8 py-3 bg-gradient-to-r from-indigo to-ember text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Go Home
                    </button>
                    <button
                        onClick={() => window.history.back()}
                        className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg border-2 border-gray-200 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Go Back
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-12">
                    <p className="text-gray-500 text-sm">
                        Need help? <a href="/contact" className="text-ember hover:text-wine underline">Contact support</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
