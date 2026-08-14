import type { FC, ReactNode } from 'react';
import { FiArrowLeft } from 'react-icons/fi';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    actions?: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, onBack, actions }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-10 h-10 rounded-full border border-gray-300 bg-white/60 flex items-center justify-center hover:bg-white transition"
                        title="Back"
                    >
                        <FiArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                )}
                <div>
                    <h1 className="text-4xl font-bold font-heading text-brand-dark dark:text-white">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                    )}
                </div>
            </div>

            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    );
};

export default PageHeader;
