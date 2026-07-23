import type { FC } from 'react';
import { FiPlus, FiArrowUpRight, FiEdit2, FiFileText } from 'react-icons/fi';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import type { Invoice } from '@/types/invoice';

interface InvoiceDetailPaneProps {
    invoice: Invoice | null;
}

const currency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const InvoiceDetailPane: FC<InvoiceDetailPaneProps> = ({ invoice }) => {
    if (!invoice) {
        return (
            <div className="flex-1 p-4">
                <div className="glass-blue rounded-2xl h-full flex items-center justify-center text-white/70 text-sm">
                    Select an invoice to see the details
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4">
            <div className="glass-blue rounded-2xl flex flex-col overflow-hidden h-full">
                <div className="p-6 pb-4 flex-shrink-0 grid grid-cols-3 gap-4 border-b border-white/15">
                    <div>
                        <p className="text-xs text-white/70 mb-2">Invoice details</p>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold font-numbers text-white">{invoice.number}</h2>
                            <InvoiceStatusBadge status={invoice.status} />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-white/70 mb-2">Company</p>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                                {invoice.company.name.charAt(0)}
                            </div>
                            <span className="text-lg font-bold font-heading text-white">{invoice.company.name}</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-white/70 mb-2">Customer</p>
                        <div className="flex items-center gap-2 min-w-0">
                            <img
                                src={invoice.customer.avatar}
                                alt={invoice.customer.name}
                                className="w-8 h-8 rounded-full border-2 border-white/30 object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{invoice.customer.name}</p>
                                <p className="text-[11px] text-white/60 truncate">{invoice.customer.title}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 flex gap-4 min-h-0 overflow-y-auto">
                    {invoice.items.map((item) => (
                        <div
                            key={item.id}
                            className="flex-1 bg-white/10 rounded-2xl p-4 flex flex-col justify-between border border-white/10 hover:bg-white/20 transition cursor-pointer relative group"
                        >
                            <FiArrowUpRight className="w-4 h-4 absolute top-4 right-4 text-white/40 group-hover:text-white transition" />
                            <div className="font-numbers text-xl text-white">{currency(item.amount)}</div>
                            <div className="text-xs text-white/70">{item.label}</div>
                        </div>
                    ))}

                    <div className="w-20 bg-white/5 rounded-2xl border border-white/10 border-dashed flex items-center justify-center cursor-pointer hover:bg-white/10 transition flex-shrink-0">
                        <FiPlus className="w-5 h-5 text-white/50" />
                    </div>
                </div>

                <div className="p-6 flex-shrink-0 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-10">
                        <div>
                            <p className="text-xs text-white/60 mb-1">Sub Total</p>
                            <p className="text-lg font-bold font-numbers text-white">{currency(invoice.amount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/60 mb-1">Total</p>
                            <p className="text-lg font-bold font-numbers text-white">{currency(invoice.amount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/60 mb-1">Balance Due</p>
                            <p className="text-lg font-bold font-numbers text-white">{currency(invoice.amount)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="p-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition text-white/80"
                            title="Edit"
                        >
                            <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className="p-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition text-white/80"
                            title="Receipt"
                        >
                            <FiFileText className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className="bg-brand-accent text-brand-dark font-bold px-6 py-2.5 rounded-xl hover:bg-[#b0dc34] transition shadow-md"
                        >
                            Pay out now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailPane;
