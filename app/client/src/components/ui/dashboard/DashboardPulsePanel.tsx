import type { FC } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const PROFIT_BARS = [32, 58, 24, 70, 46, 88, 40, 66];

const ACTIVITY_ITEMS = [
    { label: 'Created', date: 'Apr 18, 14:22', done: true },
    { label: 'Sent', date: 'Apr 18, 14:25', done: true },
    { label: 'Viewed', date: 'Apr 18, 15:01', done: true },
    { label: 'Reminder sent', date: 'Apr 25, 09:12', done: true },
    { label: 'Paid', date: '', done: false },
];

const STRIPE_COUNT = 14;
const STRIPE_FILLED = 11;

const DashboardPulsePanel: FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-brand-nearBlack2 rounded-3xl p-6 flex flex-col gap-4 text-white">
                <p className="text-xs font-medium text-white/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    Profit
                </p>
                <div>
                    <p className="text-sm text-white/60">Your average profit during 6 months is</p>
                    <p className="text-lg font-bold font-numbers">$1,450.50</p>
                </div>
                <div className="flex items-end gap-1.5 h-16">
                    {PROFIT_BARS.map((height, index) => (
                        <div
                            key={index}
                            className={`flex-1 rounded-full ${index === 5 ? 'bg-white' : 'bg-white/25'}`}
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
                <button type="button" className="text-xs text-white/50 hover:text-white transition text-left">
                    See detailed graph
                </button>
            </div>

            <div className="bg-brand-nearBlack2 rounded-3xl p-6 flex flex-col gap-4 text-white">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold font-heading">Good</h3>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Payment score</span>
                </div>
                <div className="flex items-end gap-1 h-10">
                    {Array.from({ length: STRIPE_COUNT }).map((_, index) => (
                        <div
                            key={index}
                            className={`flex-1 rounded-full ${
                                index < STRIPE_FILLED ? 'bg-white' : 'bg-white/15'
                            }`}
                            style={{ height: `${40 + (index % 3) * 20}%` }}
                        />
                    ))}
                </div>
                <p className="text-xs text-white/50">Seamless payments, right on schedule</p>
            </div>

            <div className="bg-brand-nearBlack2 rounded-3xl p-6 flex flex-col gap-4 text-white">
                <button type="button" className="flex items-center justify-between text-sm font-semibold">
                    Activity
                    <FiChevronDown className="w-4 h-4 text-white/50" />
                </button>
                <div className="flex flex-col gap-3">
                    {ACTIVITY_ITEMS.map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        item.done ? 'bg-brand-accent' : 'border border-white/30'
                                    }`}
                                />
                                <span className={item.done ? 'text-white' : 'text-white/40'}>{item.label}</span>
                            </div>
                            <span className="text-white/40 font-numbers">{item.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPulsePanel;
