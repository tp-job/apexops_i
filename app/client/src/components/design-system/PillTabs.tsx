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

/**
 * Pill navigation between destinations. `SegmentedControl` is the one for
 * filters and density toggles — see its own file for the split.
 *
 * **Every surface here carries a `dark:` sibling.** It did not until 2026-08-21:
 * the container was a bare `bg-white/70` with a white border, so on a dark page
 * this rendered as a bright slab that ignored the theme entirely. It had no call
 * sites, which is exactly why nobody saw it — a primitive nothing renders is a
 * primitive nothing checks. It is now on `/design-system`, where it is looked at.
 */
function PillTabs<T extends string>({ tabs, activeId, onChange }: PillTabsProps<T>) {
    return (
        <div className="inline-flex items-center rounded-full border border-white/60 bg-white/70 p-1.5 backdrop-blur dark:border-white/10 dark:bg-white/5">
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
                                : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-white/10'
                        }`}
                    >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-dark" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`px-1.5 rounded-md text-[11px] font-numbers ${
                                    isActive ? 'bg-white/40' : 'bg-gray-100 dark:bg-white/10 dark:text-gray-300'
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
