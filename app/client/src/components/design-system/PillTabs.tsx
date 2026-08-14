import type { ReactNode } from 'react';

interface PillTab<T extends string> {
    id: T;
    label: ReactNode;
    count?: number;
}

interface PillTabsProps<T extends string> {
    tabs: PillTab<T>[];
    activeId: T;
    onChange: (id: T) => void;
}

function PillTabs<T extends string>({ tabs, activeId, onChange }: PillTabsProps<T>) {
    return (
        <div className="inline-flex items-center bg-white/70 backdrop-blur p-1.5 rounded-full border border-white/60">
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`px-4 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-2 text-xs font-medium ${
                            isActive
                                ? 'bg-brand-accent text-brand-dark font-bold shadow-sm'
                                : 'text-gray-600 hover:bg-white'
                        }`}
                    >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-dark" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`px-1.5 rounded-md text-[11px] font-numbers ${
                                    isActive ? 'bg-white/40' : 'bg-gray-100'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default PillTabs as <T extends string>(props: PillTabsProps<T>) => ReactNode;
