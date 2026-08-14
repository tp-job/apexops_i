import type { FC, ReactNode } from 'react';

interface KpiCardProps {
    label: string;
    value: string | number;
    prefix?: string;
    suffix?: string;
    icon?: ReactNode;
}

const KpiCard: FC<KpiCardProps> = ({ label, value, prefix, suffix, icon }) => {
    return (
        <div className="flex items-start gap-4">
            {icon && (
                <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-dark flex-shrink-0">
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{label}</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                    {prefix && <span className="text-gray-400 text-lg">{prefix}</span>}
                    <h2 className="text-3xl font-bold font-numbers text-brand-dark dark:text-white">
                        {value}
                    </h2>
                    {suffix && <span className="text-gray-400 text-sm font-medium">{suffix}</span>}
                </div>
            </div>
        </div>
    );
};

export default KpiCard;
