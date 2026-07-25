import { type FC, type ReactNode, useMemo } from 'react';
import { motion } from 'motion/react';
import { EASE_LUX, stagger } from '@/lib/motion';

export interface GanttBar {
    id: string;
    label: string;
    /** Inclusive start. Accepts a Date or any string `new Date()` parses. */
    start: Date | string;
    /** Exclusive end. Must be after `start`; equal/earlier bars are dropped. */
    end: Date | string;
    /** 0–100. Renders a striped completion fill inside the bar. */
    progress?: number;
    tone?: 'neutral' | 'accent' | 'dark';
    /** Rendered at the right edge of the row (e.g. an `AvatarStack`). */
    trailing?: ReactNode;
    done?: boolean;
}

interface GanttTrackProps {
    bars: GanttBar[];
    /** Defaults to the first day of the earliest bar's month. */
    rangeStart?: Date | string;
    /** Defaults to the last day of the latest bar's month. */
    rangeEnd?: Date | string;
    /** Width of the fixed label gutter, in px. */
    labelWidth?: number;
    /** Vertical line at "now" when it falls inside the range. */
    showToday?: boolean;
    onBarClick?: (bar: GanttBar) => void;
    className?: string;
}

const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d));

const barTones: Record<NonNullable<GanttBar['tone']>, string> = {
    neutral: 'bg-brand-steel/40 dark:bg-white/15 text-brand-dark dark:text-white',
    accent: 'bg-brand-accent text-brand-dark',
    dark: 'bg-brand-dark text-white dark:bg-white/90 dark:text-brand-dark',
};

const monthLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

/**
 * Horizontal, month-spanning schedule track — the long-horizon view the
 * calendar pages lack. Bars are positioned as a percentage of the total
 * range, so the component reflows with its container and needs no measuring.
 *
 * Time is linear here, not per-day-column: a 6-month range stays readable
 * where 180 fixed columns would force horizontal scroll on every screen.
 */
const GanttTrack: FC<GanttTrackProps> = ({
    bars,
    rangeStart,
    rangeEnd,
    labelWidth = 200,
    showToday = true,
    onBarClick,
    className = '',
}) => {
    const model = useMemo(() => {
        const valid = bars
            .map((bar) => ({ bar, start: toDate(bar.start), end: toDate(bar.end) }))
            .filter(
                (b) =>
                    !Number.isNaN(b.start.getTime()) &&
                    !Number.isNaN(b.end.getTime()) &&
                    b.end.getTime() > b.start.getTime(),
            );

        if (valid.length === 0) return null;

        const earliest = rangeStart
            ? toDate(rangeStart)
            : new Date(Math.min(...valid.map((b) => b.start.getTime())));
        const latest = rangeEnd
            ? toDate(rangeEnd)
            : new Date(Math.max(...valid.map((b) => b.end.getTime())));

        // Snap to whole months so the header columns line up with the grid.
        const from = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        const to = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);
        const span = to.getTime() - from.getTime();

        const months: { key: string; label: string; leftPct: number; widthPct: number }[] = [];
        const cursor = new Date(from);
        while (cursor < to) {
            const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
            months.push({
                key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
                label: monthLabel(cursor),
                leftPct: ((cursor.getTime() - from.getTime()) / span) * 100,
                widthPct: ((next.getTime() - cursor.getTime()) / span) * 100,
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        const rows = valid.map(({ bar, start, end }) => {
            const clampedStart = Math.max(start.getTime(), from.getTime());
            const clampedEnd = Math.min(end.getTime(), to.getTime());
            return {
                bar,
                leftPct: ((clampedStart - from.getTime()) / span) * 100,
                widthPct: Math.max(((clampedEnd - clampedStart) / span) * 100, 1.5),
            };
        });

        const now = Date.now();
        const todayPct =
            showToday && now >= from.getTime() && now <= to.getTime()
                ? ((now - from.getTime()) / span) * 100
                : null;

        return { months, rows, todayPct };
    }, [bars, rangeStart, rangeEnd, showToday]);

    if (!model) return null;

    const gutter = { width: labelWidth, minWidth: labelWidth };

    return (
        <div className={`w-full ${className}`.trim()}>
            {/* month header */}
            <div className="flex items-end">
                <div style={gutter} className="flex-shrink-0" />
                <div className="relative flex-1 h-7">
                    {model.months.map((month) => (
                        <span
                            key={month.key}
                            className="absolute top-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate pl-2 border-l border-gray-200 dark:border-white/10 h-full"
                            style={{ left: `${month.leftPct}%`, width: `${month.widthPct}%` }}
                        >
                            {month.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* rows */}
            <motion.div
                className="relative"
                variants={stagger(0.05)}
                initial="hidden"
                animate="show"
            >
                {/* month gridlines + today marker span all rows */}
                <div
                    aria-hidden
                    className="absolute inset-y-0 right-0 pointer-events-none"
                    style={{ left: labelWidth }}
                >
                    {model.months.map((month) => (
                        <span
                            key={month.key}
                            className="absolute inset-y-0 w-px bg-gray-200 dark:bg-white/10"
                            style={{ left: `${month.leftPct}%` }}
                        />
                    ))}
                    {model.todayPct !== null && (
                        <span
                            className="absolute inset-y-0 w-px bg-brand-accent"
                            style={{ left: `${model.todayPct}%` }}
                        />
                    )}
                </div>

                {model.rows.map(({ bar, leftPct, widthPct }) => (
                    <motion.div
                        key={bar.id}
                        variants={{
                            hidden: { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_LUX } },
                        }}
                        className="flex items-center h-12 relative"
                    >
                        <div style={gutter} className="flex-shrink-0 pr-4 min-w-0">
                            <p
                                className={`text-sm font-medium truncate ${
                                    bar.done
                                        ? 'text-gray-400 dark:text-gray-500 line-through'
                                        : 'text-brand-dark dark:text-white'
                                }`}
                            >
                                {bar.label}
                            </p>
                        </div>

                        <div className="relative flex-1 h-full">
                            <motion.button
                                type="button"
                                disabled={!onBarClick}
                                onClick={onBarClick ? () => onBarClick(bar) : undefined}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, ease: EASE_LUX }}
                                title={bar.label}
                                className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg origin-left overflow-hidden flex items-center px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:focus-visible:ring-brand-accent/50 ${
                                    barTones[bar.tone ?? 'neutral']
                                } ${bar.done ? 'opacity-50' : ''} ${onBarClick ? 'cursor-pointer' : 'cursor-default'}`}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            >
                                {bar.progress !== undefined && (
                                    <span
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 ds-stripe-fill"
                                        style={{
                                            width: `${Math.max(0, Math.min(100, bar.progress))}%`,
                                        }}
                                    />
                                )}
                                <span className="relative truncate">{bar.label}</span>
                            </motion.button>
                        </div>

                        {bar.trailing && (
                            <div className="flex-shrink-0 pl-3">{bar.trailing}</div>
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default GanttTrack;
