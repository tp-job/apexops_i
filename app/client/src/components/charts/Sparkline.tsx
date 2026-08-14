import type { FC } from 'react';
import { useMemo } from 'react';

interface Props {
    /** Counts in bucket order. Gap-filled by the server, so index === time step. */
    values: number[];
    /** Names what is being counted, for the accessible label. */
    unitLabel?: string;
    className?: string;
}

const W = 72;
const H = 22;
/** Room for the 2px stroke so the extremes aren't clipped at the box edge. */
const PAD = 2;

/**
 * Trend shape for one row, no axes and no labels.
 *
 * A sparkline is deliberately unreadable as a *value* — it answers "rising,
 * falling, or spiky?" and nothing else. That is only acceptable because the
 * magnitude sits in the same table row: the `events` column carries the number,
 * this carries the shape. Dropped into a context without that column it would be
 * decoration, since there is no axis to read it against.
 *
 * Scaled to its own maximum, not a shared one. Rows are compared by the numbers
 * beside them; forcing every row onto a global scale would flatten quiet projects
 * into a dead line and destroy the only thing this mark is here to show.
 */
const Sparkline: FC<Props> = ({ values, unitLabel = 'events', className }) => {
    const { line, area, max, total } = useMemo(() => {
        const max = values.reduce((m, v) => Math.max(m, v), 0);
        const total = values.reduce((s, v) => s + v, 0);
        const span = values.length > 1 ? values.length - 1 : 1;
        const usable = H - PAD * 2;

        const points = values.map((v, i) => {
            const x = (i / span) * W;
            // A flat run sits on the baseline rather than mid-box: "no events" and
            // "steady volume" must not draw the same line.
            const y = max === 0 ? H - PAD : H - PAD - (v / max) * usable;
            return [x, y] as const;
        });

        return {
            max,
            total,
            line: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
            area: `${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} ${W},${H} 0,${H}`,
        };
    }, [values]);

    if (values.length < 2) return null;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            className={['overflow-visible', className].filter(Boolean).join(' ')}
            role="img"
            aria-label={`Trend: ${total} ${unitLabel} across ${values.length} buckets, peak ${max}`}
        >
            <polygon points={area} className="fill-brand-dark/10 dark:fill-brand-accent/15" />
            <polyline
                points={line}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-brand-dark/70 dark:stroke-brand-accent"
            />
        </svg>
    );
};

export default Sparkline;
