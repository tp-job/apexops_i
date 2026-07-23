import type { FC } from 'react';
import { FiArrowLeft, FiSliders, FiPlus } from 'react-icons/fi';

interface InvoicePageHeaderProps {
    onCreateInvoice?: () => void;
    onToggleFilters?: () => void;
    onBack?: () => void;
}

const InvoicePageHeader: FC<InvoicePageHeaderProps> = ({ onCreateInvoice, onToggleFilters, onBack }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="w-10 h-10 rounded-full border border-gray-300 bg-white/60 flex items-center justify-center hover:bg-white transition"
                    title="Back"
                >
                    <FiArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h1 className="text-4xl font-bold font-heading text-brand-dark">Invoices</h1>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onToggleFilters}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                    title="Filters"
                >
                    <FiSliders className="w-4 h-4 text-gray-600" />
                </button>
                <button
                    type="button"
                    onClick={onCreateInvoice}
                    className="bg-white/60 hover:bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                >
                    <FiPlus className="w-4 h-4" />
                    Create an invoice
                </button>
            </div>
        </div>
    );
};

export default InvoicePageHeader;
