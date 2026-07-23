import type { FC } from 'react';
import InvoiceKpiCard from './InvoiceKpiCard';
import InvoiceMonthlyTimeline from './InvoiceMonthlyTimeline';
import type { Invoice } from '@/types/invoice';

interface InvoiceKpiOverviewProps {
    invoices: Invoice[];
}

const InvoiceKpiOverview: FC<InvoiceKpiOverviewProps> = ({ invoices }) => {
    const overdueTotal = 31211;
    const dueTotal = 172560;
    const avgDays = 12;

    const avatars = invoices.map((invoice) => invoice.avatar);

    const months = [
        { label: 'Sep', fillPct: 100, avatars: avatars.slice(0, 6) },
        { label: 'Oct', fillPct: 55, avatars: [] },
        { label: 'Nov', fillPct: 0, avatars: avatars.slice(0, 3) },
        { label: 'Dec', fillPct: 0, avatars: avatars.slice(0, 2) },
    ];

    return (
        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-8">
            <div className="grid grid-cols-3 gap-6">
                <InvoiceKpiCard label="Overdue" prefix="$" value={overdueTotal.toLocaleString()} />
                <InvoiceKpiCard label="Due within next month" prefix="$" value={dueTotal.toLocaleString()} />
                <InvoiceKpiCard label="Average time to get paid" value={String(avgDays)} suffix="days" />
            </div>

            <InvoiceMonthlyTimeline months={months} />
        </div>
    );
};

export default InvoiceKpiOverview;
