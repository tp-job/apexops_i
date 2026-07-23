import type { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ServerErrorLayoutProps {
    statusCode: number;
    title: string;
    description: string;
    numberGradientClass: string;
    blurClass: string;
    illustration: ReactNode;
    /** Optional content between illustration and action buttons (e.g. error code badge, countdown) */
    children?: ReactNode;
    primaryButtonText?: string;
    /** Optional help text below buttons */
    helpContent?: ReactNode;
}

export const ServerErrorLayout: FC<ServerErrorLayoutProps> = ({
    statusCode,
    title,
    description,
    numberGradientClass,
    blurClass,
    illustration,
    children,
    primaryButtonText = 'Try Again',
    helpContent,
}) => {
    const navigate = useNavigate();

    const reloadPage = () => window.location.reload();
    const goHome = () => navigate('/');

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <div className="text-center px-4 max-w-2xl mx-auto">
                <div className="relative mb-8">
                    <h1
                        className={`text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r animate-pulse ${numberGradientClass}`}
                    >
                        {statusCode}
                    </h1>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
                        <div className={`w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl opacity-50 animate-ping ${blurClass}`} />
                    </div>
                </div>

                <div className="mt-8 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        {title}
                    </h2>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="my-10 flex justify-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                        {illustration}
                    </div>
                </div>

                {children}

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <button
                        onClick={reloadPage}
                        className="px-8 py-3.5 bg-gradient-to-r from-global-red to-orange-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        {primaryButtonText}
                    </button>
                    <button
                        onClick={goHome}
                        className="px-8 py-3.5 bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary font-semibold rounded-xl shadow-md hover:shadow-lg border-2 border-light-border dark:border-dark-border transform hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto"
                    >
                        Go Home
                    </button>
                </div>

                {helpContent && <div className="mt-12">{helpContent}</div>}
            </div>
        </div>
    );
};
