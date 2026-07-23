import type { FC } from 'react';
import { useState } from 'react';
import {
    FiGrid,
    FiMail,
    FiTag,
    FiBriefcase,
    FiCalendar,
    FiClipboard,
    FiFolder,
    FiUsers,
    FiBell,
    FiSettings,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

const NAV_ITEMS = ['Estimates', 'Invoices', 'Payments', 'Recurring Invoices', 'Checkouts'] as const;

const ACTION_ICONS = [FiTag, FiBriefcase, FiCalendar, FiClipboard, FiFolder, FiUsers];

const InvoiceTopHeader: FC = () => {
    const [active, setActive] = useState<(typeof NAV_ITEMS)[number]>('Invoices');

    return (
        <div className="glass-panel rounded-full pl-5 pr-2 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
                <HiSparkles className="w-4 h-4 text-brand-dark" />
                <span className="font-heading font-semibold text-brand-dark text-sm lowercase">salesforce</span>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
                <button
                    type="button"
                    className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0 hover:bg-white/60 transition"
                    title="Apps"
                >
                    <FiGrid className="w-4 h-4 text-gray-500" />
                </button>
                <button
                    type="button"
                    className="w-9 h-9 rounded-full border-2 border-brand-dark flex items-center justify-center flex-shrink-0 hover:bg-white/60 transition"
                    title="Mail"
                >
                    <FiMail className="w-4 h-4 text-brand-dark" />
                </button>

                <nav className="bg-white/70 rounded-full p-1.5 flex items-center gap-1 text-xs font-medium overflow-x-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item === active;
                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setActive(item)}
                                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-brand-accent text-brand-dark font-bold'
                                        : 'text-gray-500 hover:bg-white'
                                }`}
                            >
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-dark" />}
                                {item}
                            </button>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ACTION_ICONS.map((Icon, index) => (
                        <button
                            key={index}
                            type="button"
                            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white/60 transition"
                        >
                            <Icon className="w-4 h-4 text-gray-500" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    type="button"
                    className="relative w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                    title="Notifications"
                >
                    <FiBell className="w-4 h-4 text-gray-600" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
                <button
                    type="button"
                    className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                    title="Settings"
                >
                    <FiSettings className="w-4 h-4 text-gray-600" />
                </button>
                <img
                    src="https://i.pravatar.cc/64?img=68"
                    alt="profile"
                    className="w-9 h-9 rounded-full border-2 border-white object-cover"
                />
            </div>
        </div>
    );
};

export default InvoiceTopHeader;
