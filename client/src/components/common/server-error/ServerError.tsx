import type { FC } from 'react'

const ServerError: FC = () => {
    const reloadPage = () => {
        window.location.reload();
    };

    const goHome = () => {
        window.location.href = '/';
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
            <div className="text-center px-4">
                {/* 500 Number with Animation */}
                <div className="relative">
                    <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 animate-pulse">
                        500
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 bg-red-200 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-6">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-3">
                        Internal Server Error
                    </h2>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                        Oops! Something went wrong on our end. We're working to fix the issue. Please try again later.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-8">
                    <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Server Icon with Error */}
                        <rect x="50" y="60" width="100" height="80" rx="8" stroke="#DC2626" strokeWidth="4" fill="#FEE2E2" />
                        <line x1="60" y1="80" x2="140" y2="80" stroke="#DC2626" strokeWidth="2" />
                        <line x1="60" y1="100" x2="140" y2="100" stroke="#DC2626" strokeWidth="2" />
                        <line x1="60" y1="120" x2="140" y2="120" stroke="#DC2626" strokeWidth="2" />

                        {/* Error Symbol */}
                        <circle cx="100" cy="100" r="25" fill="#DC2626" opacity="0.9" />
                        <line x1="100" y1="90" x2="100" y2="105" stroke="white" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="100" cy="112" r="2" fill="white" />

                        {/* Warning indicators */}
                        <circle cx="70" cy="75" r="3" fill="#DC2626" className="animate-pulse" />
                        <circle cx="100" cy="75" r="3" fill="#DC2626" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <circle cx="130" cy="75" r="3" fill="#DC2626" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </svg>
                </div>

                {/* Error Code (Optional) */}
                <div className="mb-6">
                    <div className="inline-block bg-red-100 border border-red-300 rounded-lg px-4 py-2">
                        <p className="text-red-700 text-sm font-mono">
                            Error Code: 500 - Internal Server Error
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        Try Again
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
                        If the problem persists, please{' '}
                        <a href="/contact" className="text-red-600 hover:text-red-700 underline">
                            contact support
                        </a>
                    </p>
                </div>

                {/* Status Message */}
                <div className="mt-6">
                    <p className="text-gray-400 text-xs">
                        Our team has been notified and is investigating the issue.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ServerError