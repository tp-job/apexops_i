import type { FC } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
    /** 1-based. */
    page: number;
    pageSize: number;
    /** Server-reported total row count — every list endpoint returns one. */
    total: number;
    onPageChange: (page: number) => void;
    /** Noun for the range readout: "24 issues". */
    itemLabel?: string;
    className?: string;
}

const btn =
    'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-brand-dark outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-dark/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-brand-accent/40';

/**
 * Server-side pager.
 *
 * Deliberately not a numbered page-list: issue counts move constantly as events
 * arrive, so "page 7 of 43" is stale the moment it renders and clicking a far
 * page number lands somewhere unpredictable. Prev/next plus an honest range
 * readout is the shape that stays true.
 *
 * Renders nothing for a single page — a pager under a 3-row table is noise.
 */
const Pagination: FC<PaginationProps> = ({
    page,
    pageSize,
    total,
    onPageChange,
    itemLabel = 'items',
    className = '',
}) => {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (pageCount <= 1) return null;

    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <nav
            aria-label="Pagination"
            className={`flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}
        >
            {/* aria-live so a screen reader hears the new range after paging —
                otherwise the table silently swaps under the user. */}
            <p aria-live="polite" className="text-xs text-gray-500 dark:text-gray-400">
                {first}–{last} of {total} {itemLabel}
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={btn}
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <FiChevronLeft size={14} />
                    Previous
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Page {page} of {pageCount}
                </span>
                <button
                    type="button"
                    className={btn}
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pageCount}
                >
                    Next
                    <FiChevronRight size={14} />
                </button>
            </div>
        </nav>
    );
};

export default Pagination;
