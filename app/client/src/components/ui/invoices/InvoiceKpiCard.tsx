import type { FC } from 'react';

interface InvoiceKpiCardProps {
    label: string;
    value: string;
    prefix?: string;
    suffix?: string;
}

const InvoiceKpiCard: FC<InvoiceKpiCardProps> = ({ label, value, prefix, suffix }) => {
    return (
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                {prefix && <span className="text-gray-400 text-lg">{prefix}</span>}
                <h2 className="text-3xl font-bold font-numbers text-brand-dark">{value}</h2>
                {suffix && <span className="text-gray-400 text-sm font-medium">{suffix}</span>}
            </div>
        </div>
    );
};

export default InvoiceKpiCard;
