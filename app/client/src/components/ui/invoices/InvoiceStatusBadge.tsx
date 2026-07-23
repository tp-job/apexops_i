import type { FC } from 'react';
import type { InvoiceStatus } from '@/types/invoice';

interface InvoiceStatusBadgeProps {
    status: InvoiceStatus;
}

const LABELS: Record<InvoiceStatus, string> = {
    unsent: 'Unsent',
    viewed: 'Viewed',
    overdue: 'Overdue',
    due: 'Due',
    paid: 'Paid',
};

const FILLED_STATUSES: InvoiceStatus[] = ['unsent', 'overdue'];

const InvoiceStatusBadge: FC<InvoiceStatusBadgeProps> = ({ status }) => {
    const isFilled = FILLED_STATUSES.includes(status);

    if (isFilled) {
        return (
            <span className="px-2 py-0.5 rounded bg-white text-brand-dark font-medium text-[10px] uppercase tracking-wider">
                {LABELS[status]}
            </span>
        );
    }

    return (
        <span className="px-2 py-0.5 rounded border border-gray-600 text-[10px] text-gray-400 uppercase tracking-wider">
            {LABELS[status]}
        </span>
    );
};

export default InvoiceStatusBadge;
