import type { FC } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';

interface InvoicePayoutCardProps {
    onPayOut?: () => void;
}

const InvoicePayoutCard: FC<InvoicePayoutCardProps> = ({ onPayOut }) => {
    return (
        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6 h-full">
            <div className="flex items-start justify-between">
                <p className="text-gray-500 text-sm font-medium">Available for Instant Payout</p>
                <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/60 transition"
                    title="Expand"
                >
                    <FiArrowUpRight className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            <div className="flex items-center gap-2 -mt-2">
                <span className="text-gray-400 text-lg">$</span>
                <h2 className="text-3xl font-bold font-numbers text-brand-dark">214,390.00</h2>
                <span className="px-2 py-1 rounded-full border border-gray-300 text-[10px] font-medium text-gray-500 uppercase tracking-wider ml-1">
                    Expects
                </span>
            </div>

            <div className="flex items-stretch gap-3">
                <div className="bg-gray-100/60 rounded-xl p-3 flex-1 flex flex-col justify-between min-h-[76px]">
                    <span className="text-xs font-numbers text-gray-500">*4443</span>
                    <span className="text-xs font-medium text-gray-400 mt-auto">Visa</span>
                </div>

                <div className="bg-brand-accent rounded-xl p-3 flex-1 flex flex-col justify-between min-h-[76px] shadow-sm">
                    <span className="text-xs font-numbers text-brand-dark font-bold">#177210</span>
                    <span className="text-xs font-medium text-brand-dark mt-auto">Stripe</span>
                </div>

                <div className="bg-gray-100/60 rounded-xl p-3 flex-1 flex flex-col justify-between min-h-[76px]">
                    <span className="text-xs font-numbers text-gray-500">#711221</span>
                    <span className="text-xs font-medium text-gray-400 mt-auto">PayPal</span>
                </div>

                <button
                    type="button"
                    onClick={onPayOut}
                    className="bg-brand-dark text-white font-semibold px-5 rounded-xl hover:bg-black transition shadow-md text-sm whitespace-nowrap flex-shrink-0"
                >
                    Pay out now
                </button>
            </div>
        </div>
    );
};

export default InvoicePayoutCard;
