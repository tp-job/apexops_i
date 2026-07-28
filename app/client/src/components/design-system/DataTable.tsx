import type { ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { SkeletonText } from './Skeleton';
import EmptyState from './EmptyState';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
    /** Stable key. Doubles as the sort key sent to the server when `sortable`. */
    key: string;
    header: ReactNode;
    /** Cell renderer. Gets the whole row — no per-column accessor indirection. */
    render: (row: T) => ReactNode;
    sortable?: boolean;
    /** Tailwind width/alignment classes applied to both <th> and <td>. */
    className?: string;
    /** Hidden below `md`. Use for columns that are context, not identity. */
    hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    /** Stable React key per row. */
    rowKey: (row: T) => string | number;
    loading?: boolean;
    /** Shown when `rows` is empty and not loading. */
    empty?: ReactNode;
    /** Current sort. Sorting is server-side; this only reflects and requests it. */
    sort?: { key: string; direction: SortDirection };
    onSortChange?: (key: string, direction: SortDirection) => void;
    /** Whole-row activation. Adds hover affordance, keyboard access and a11y wiring. */
    onRowClick?: (row: T) => void;
    /** Accessible name for the table. Required — a bare grid announces as nothing. */
    caption: string;
    className?: string;
}

const th =
    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const td = 'px-4 py-3 text-sm text-brand-dark dark:text-gray-200 align-middle';

/**
 * The system's table.
 *
 * One table for every list surface — issues, logs, users, documents — because
 * "search + filter + sort + paginate a list" is one problem, and solving it four
 * times produces four subtly different tables. Pair with `Pagination`.
 *
 * **Sorting is server-side by design.** The component holds no row state and
 * never reorders `rows`; it renders the sort indicator and calls
 * `onSortChange`. Client-side sorting would only order the current page, which
 * silently lies as soon as the list is longer than one page.
 *
 * Virtualization is deliberately absent. `react-virtuoso` is already a
 * dependency and can be dropped in behind this API when a real surface needs it;
 * adding it now would mean a fixed row height and a broken `<table>` for a
 * 25-row page.
 */
function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading = false,
    empty,
    sort,
    onSortChange,
    onRowClick,
    caption,
    className = '',
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className={className}>
                <SkeletonText lines={6} />
            </div>
        );
    }

    if (!rows.length) {
        return (
            <div className={className}>
                {empty ?? <EmptyState title="Nothing here yet" size="sm" />}
            </div>
        );
    }

    const toggle = (col: Column<T>) => {
        if (!col.sortable || !onSortChange) return;
        const next: SortDirection =
            sort?.key === col.key && sort.direction === 'desc' ? 'asc' : 'desc';
        onSortChange(col.key, next);
    };

    return (
        // Wide tables scroll inside their own container so the page body never
        // scrolls horizontally.
        <div className={`overflow-x-auto ${className}`.trim()}>
            <table className="w-full border-collapse">
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                        {columns.map((col) => {
                            const active = sort?.key === col.key;
                            return (
                                <th
                                    key={col.key}
                                    scope="col"
                                    // aria-sort on the header is what lets a screen reader
                                    // user know the order changed without re-reading the table.
                                    aria-sort={
                                        active
                                            ? sort!.direction === 'asc'
                                                ? 'ascending'
                                                : 'descending'
                                            : undefined
                                    }
                                    className={`${th} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className ?? ''}`.trim()}
                                >
                                    {col.sortable && onSortChange ? (
                                        <button
                                            type="button"
                                            onClick={() => toggle(col)}
                                            className="inline-flex items-center gap-1 rounded-md outline-none transition-colors hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:hover:text-white dark:focus-visible:ring-brand-accent/40"
                                        >
                                            {col.header}
                                            {active &&
                                                (sort!.direction === 'asc' ? (
                                                    <FiChevronUp size={12} />
                                                ) : (
                                                    <FiChevronDown size={12} />
                                                ))}
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={rowKey(row)}
                            // A clickable row must be reachable and activatable by
                            // keyboard, or the entire surface is mouse-only.
                            {...(onRowClick
                                ? {
                                      onClick: () => onRowClick(row),
                                      onKeyDown: (e: React.KeyboardEvent) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              onRowClick(row);
                                          }
                                      },
                                      tabIndex: 0,
                                      role: 'button',
                                      className:
                                          'cursor-pointer border-b border-gray-100 outline-none transition-colors hover:bg-black/[0.03] focus-visible:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-dark/30 dark:border-white/5 dark:hover:bg-white/5 dark:focus-visible:bg-white/5 dark:focus-visible:ring-brand-accent/40',
                                  }
                                : {
                                      className: 'border-b border-gray-100 dark:border-white/5',
                                  })}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`${td} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${col.className ?? ''}`.trim()}
                                >
                                    {col.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;
