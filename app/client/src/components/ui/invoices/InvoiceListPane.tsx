import type { FC } from 'react';
import { FiList, FiMoreVertical } from 'react-icons/fi';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import type { Invoice } from '@/types/invoice';

interface InvoiceListPaneProps {
    invoices: Invoice[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const InvoiceListPane: FC<InvoiceListPaneProps> = ({ invoices, selectedId, onSelect }) => {
    return (
        <div className="w-2/5 border-r border-white/10 flex flex-col pt-4">
            <div className="px-6 pb-4 flex-shrink-0 flex items-center justify-between">
                <h3 className="text-white font-heading font-bold">Unpaid Invoices</h3>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition"
                    >
                        <FiList className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition"
                    >
                        <FiMoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
                {invoices.map((invoice) => {
                    const isActive = invoice.id === selectedId;

                    return (
                        <div
                            key={invoice.id}
                            onClick={() => onSelect(invoice.id)}
                            className={
                                isActive
                                    ? 'relative flex items-center justify-between p-3 rounded-2xl bg-brand-steel/40 border border-brand-steel/60 cursor-pointer shadow-lg'
                                    : 'flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition border border-transparent hover:border-white/10'
                            }
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <img
                                    src={invoice.avatar}
                                    alt={invoice.company.name}
                                    className="w-9 h-9 rounded-full border-2 border-white/20 object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-numbers font-medium text-white truncate">
                                        {invoice.number}
                                    </p>
                                    <p className="text-xs text-white/50">In {invoice.dueInDays} days</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                                <InvoiceStatusBadge status={invoice.status} />
                                <span className="text-sm font-numbers font-semibold text-white w-24 text-right">
                                    ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InvoiceListPane;
