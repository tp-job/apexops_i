import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { DOCS, DOC_GROUPS } from '@/content/docs';

/**
 * Left navigation for `/docs`.
 *
 * The search box **filters this list** rather than opening a results page. It is
 * the cheapest thing that is genuinely useful at this size — a handful of pages,
 * where "show me the ones about keys" is the actual question. A decorative
 * search input that does nothing would be worse than none at all.
 *
 * Matching runs over title, group and summary, so searching "grouping" finds the
 * Concepts page and searching "curl" finds the API pages through their summaries.
 */
const DocsSidebar: FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matches = q
            ? DOCS.filter((d) =>
                  `${d.title} ${d.group} ${d.summary}`.toLowerCase().includes(q)
              )
            : DOCS;

        return DOC_GROUPS.map((group) => ({
            group,
            pages: matches.filter((d) => d.group === group),
        })).filter((g) => g.pages.length > 0);
    }, [query]);

    return (
        <div className="flex h-full flex-col gap-5">
            <div className="relative">
                <span
                    className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-gray-400"
                    aria-hidden
                >
                    <FiSearch size={15} />
                </span>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search documentation"
                    placeholder="Search docs"
                    className="w-full rounded-xl border border-gray-200 bg-white/70 py-2 pl-9 pr-8 text-sm text-brand-dark outline-none transition-colors placeholder:text-gray-400 focus-visible:border-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 dark:focus-visible:border-brand-accent dark:focus-visible:ring-brand-accent/30"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        className="absolute inset-y-0 right-0 grid w-8 place-items-center text-gray-400 outline-none transition-colors hover:text-brand-dark focus-visible:text-brand-dark dark:hover:text-white"
                    >
                        <FiX size={14} />
                    </button>
                )}
            </div>

            <nav aria-label="Documentation" className="flex flex-col gap-6 overflow-y-auto pb-8">
                {groups.map(({ group, pages }) => (
                    <div key={group} className="flex flex-col gap-1">
                        <p className="px-3 pb-1 text-[13px] font-bold text-brand-dark dark:text-white">
                            {group}
                        </p>
                        {pages.map((page) => (
                            <NavLink
                                key={page.slug}
                                to={`/docs/${page.slug}`}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                    [
                                        'rounded-lg px-3 py-1.5 text-[13.5px] outline-none transition-colors',
                                        'focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:focus-visible:ring-brand-accent/40',
                                        isActive
                                            ? 'bg-brand-dark/[0.06] font-semibold text-brand-dark dark:bg-brand-accent/10 dark:text-brand-accent'
                                            : 'text-gray-600 hover:bg-black/[0.04] hover:text-brand-dark dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
                                    ].join(' ')
                                }
                            >
                                {page.title}
                            </NavLink>
                        ))}
                    </div>
                ))}

                {groups.length === 0 && (
                    <p className="px-3 text-[13px] text-gray-500 dark:text-gray-400">
                        Nothing matches “{query}”.
                    </p>
                )}
            </nav>
        </div>
    );
};

export default DocsSidebar;
