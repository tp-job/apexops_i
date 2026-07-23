import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: FC = () => {
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/');
    };

    const goBack = () => {
        navigate(-1);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <div className="text-center px-4 max-w-2xl mx-auto">
                {/* 404 Number with Animation */}
                <div className="relative mb-8">
                    <h1 className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-primary via-orange-primary to-pink-500 animate-pulse">
                        404
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className="w-64 h-64 md:w-96 md:h-96 bg-blue-primary/20 dark:bg-blue-primary/10 rounded-full blur-3xl opacity-50 animate-ping"></div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mt-8 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        Page Not Found
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
                        Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
                    </p>
                </div>

                {/* Illustration */}
                <div className="my-10 flex justify-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                        <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Broken Link Icon */}
                            <circle 
                                cx="100" 
                                cy="100" 
                                r="80" 
                                stroke="currentColor" 
                                strokeWidth="8" 
                                strokeDasharray="15 10" 
                                className="text-light-border dark:text-dark-border animate-spin" 
                                style={{ animationDuration: '20s' }} 
                            />
                            <path 
                                d="M70 80 L85 95 M85 95 L70 110" 
                                stroke="currentColor" 
                                strokeWidth="6" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="text-blue-primary"
                            />
                            <path 
                                d="M130 80 L115 95 M115 95 L130 110" 
                                stroke="currentColor" 
                                strokeWidth="6" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="text-orange-primary"
                            />
                            <circle cx="100" cy="130" r="3" fill="currentColor" className="text-pink-500" />
                            <circle cx="90" cy="140" r="2" fill="currentColor" className="text-blue-primary" />
                            <circle cx="110" cy="140" r="2" fill="currentColor" className="text-orange-primary" />
                        </svg>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <button
                        onClick={goHome}
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-primary to-orange-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Go Home
                    </button>
                    <button
                        onClick={goBack}
                        className="px-8 py-3.5 bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary font-semibold rounded-xl shadow-md hover:shadow-lg border-2 border-light-border dark:border-dark-border transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Go Back
                    </button>
                </div>

                {/* Help Text */}
                <div className="mt-12">
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                        Need help?{' '}
                        <a href="/contact" className="text-orange-primary hover:text-blue-primary underline transition-colors">
                            Contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
