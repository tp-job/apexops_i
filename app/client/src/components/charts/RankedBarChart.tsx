import type { FC } from 'react';
import { formatNumber } from '@/utils/format';

export interface RankedBar {
    id: string | number;
    label: string;
    value: number;
}

interface Props {
    bars: RankedBar[];
    /** Names the measure — "events", "unresolved issues". Used in the a11y label. */
    unitLabel: string;
    maxBars?: number;
}

/**
 * Magnitude comparison across a nominal set, no time axis.
 *
 * Horizontal, because the labels are project names: a vertical bar chart would
 * truncate or rotate them, and a chart whose categories you cannot read is a
 * chart you cannot use.
 *
 * **Every bar is the same colour.** Shading them darker-where-longer would encode
 * magnitude twice — the length already says it — and burn the one free channel on
 * information the reader has. These categories have no natural order, so a ramp
 * would also be claiming an ordinality that isn't there.
 *
 * Values are labelled at the bar end rather than left to a tooltip: this is the
 * chart people read the actual numbers off, and a value only reachable by hover is
 * unreachable by keyboard.
 */
const RankedBarChart: FC<Props> = ({ bars, unitLabel, maxBars = 8 }) => {
    const rows = bars.slice(0, maxBars);
    const hidden = bars.length - rows.length;
    const max = rows.reduce((m, b) => Math.max(m, b.value), 0);

    if (!rows.length) return null;

    return (
        <div className="flex flex-col gap-2.5">
            <ul
                className="flex flex-col gap-2.5"
                aria-label={`Projects ranked by ${unitLabel}`}
            >
                {rows.map((b) => (
                    <li key={b.id} className="flex items-center gap-3">
                        <span
                            className="w-28 shrink-0 truncate text-right text-[11px] text-gray-500 dark:text-gray-400"
                            title={b.label}
                        >
                            {b.label}
                        </span>

                        <div className="flex flex-1 items-center gap-2">
                            <div className="h-4 flex-1 overflow-hidden rounded-[4px] bg-black/[0.04] dark:bg-white/[0.05]">
                                <div
                                    className="h-full rounded-r-[4px] bg-brand-dark/70 transition-[width] dark:bg-brand-accent/80"
                                    style={{
                                        // A measured zero keeps a hairline. Collapsing it to
                                        // nothing makes "none" and "not reported" identical.
                                        width:
                                            max === 0 || b.value === 0
                                                ? '2px'
                                                : `max(3px, ${(b.value / max) * 100}%)`,
                                    }}
                                />
                            </div>
                            {/* tabular-nums is right here specifically because these
                                numbers stack into a column and must align. */}
                            <span className="w-14 shrink-0 text-right font-numbers text-xs font-semibold tabular-nums text-brand-dark dark:text-gray-200">
                                {formatNumber(b.value)}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>

            {hidden > 0 && (
                <span className="pl-[7.75rem] text-[11px] text-gray-400 dark:text-gray-500">
                    +{hidden} more project{hidden === 1 ? '' : 's'} not shown
                </span>
            )}
        </div>
    );
};

export default RankedBarChart;
