import type { FC } from 'react';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { IssueRange, TimelineBucket } from '@/types/projects';

export interface ChartMarker {
    /** ISO instant to pin against the time axis. */
    at: string;
    label: string;
    /** `release` is the deploy pin; `event` is a lifecycle moment (first seen). */
    kind?: 'release' | 'event';
}

interface Props {
    buckets: TimelineBucket[];
    range: IssueRange;
    markers?: ChartMarker[];
    /** Axis caption. Say what is being counted — the number is otherwise ambiguous. */
    unitLabel?: string;
}

/**
 * Event volume over time, with pinned markers.
 *
 * Shared by the issue detail (occurrences of one error, marked "first seen") and
 * the project overview (all events, marked with releases). Generalising the
 * marker from a single timestamp to a list is what let one component serve both
 * — the alternative was a second chart that would drift from this one.
 *
 * **The markers are the point on the overview.** A volume chart alone is a
 * prettier restatement of the issue list; volume *with deploy pins* answers the
 * question the issue list structurally cannot — *did the spike start with a
 * release?* — which is the first thing anyone asks when a graph turns upward.
 *
 * Hand-rolled rather than a chart library: `recharts` is a dependency but unused
 * app-wide, and this is a fixed-bucket histogram with no axes to compute, no
 * legend and no zoom.
 *
 * Bars scale to the busiest bucket, not an absolute maximum — the question is
 * "when did it spike", which is a relative shape.
 */
const EventVolumeChart: FC<Props> = ({ buckets, range, markers = [], unitLabel = 'events' }) => {
    const [hovered, setHovered] = useState<number | null>(null);

    const max = useMemo(() => buckets.reduce((m, b) => Math.max(m, b.count), 0), [buckets]);
    const hourly = range === '24h';
    const total = useMemo(() => buckets.reduce((s, b) => s + b.count, 0), [buckets]);

    /**
     * Markers are resolved to a bucket index once, here, rather than positioned by
     * percentage. Buckets are equal-width flex children, so an index maps to a
     * column exactly; a percentage would drift against the gaps between bars.
     */
    const markersByBucket = useMemo(() => {
        const map = new Map<number, ChartMarker[]>();
        if (!buckets.length) return map;

        for (const m of markers) {
            const t = new Date(m.at).getTime();
            const idx = buckets.findIndex((b, i) => {
                const start = new Date(b.start).getTime();
                const next = buckets[i + 1] ? new Date(buckets[i + 1].start).getTime() : Infinity;
                return t >= start && t < next;
            });
            if (idx === -1) continue; // Outside the visible window — drop it.
            const list = map.get(idx) ?? [];
            list.push(m);
            map.set(idx, list);
        }
        return map;
    }, [markers, buckets]);

    const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));
    const labelFor = (iso: string) => (hourly ? dayjs(iso).format('HH:mm') : dayjs(iso).format('D MMM'));

    if (!buckets.length) return null;

    return (
        <div className="flex flex-col gap-2">
            <div
                className="relative flex h-36 items-end gap-[2px]"
                role="img"
                aria-label={`Volume: ${total} ${unitLabel} across ${buckets.length} ${hourly ? 'hourly' : 'daily'} buckets${markers.length ? `, ${markers.length} markers` : ''}`}
            >
                {buckets.map((b, i) => {
                    const pct = max === 0 ? 0 : (b.count / max) * 100;
                    const active = hovered === i;
                    const pins = markersByBucket.get(i) ?? [];

                    return (
                        <div
                            key={b.start}
                            className="group relative flex h-full flex-1 items-end"
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            {/* Full-height hit area: a 3px bar is impossible to hover, and
                                quiet buckets are exactly the ones worth inspecting. */}
                            <div
                                className={[
                                    'w-full rounded-[3px] transition-colors',
                                    b.count === 0
                                        ? 'bg-black/[0.05] dark:bg-white/[0.06]'
                                        : active
                                          ? 'bg-brand-dark dark:bg-brand-accent'
                                          : 'bg-brand-dark/55 dark:bg-brand-accent/60',
                                ].join(' ')}
                                style={{
                                    // Empty buckets keep a hairline so the axis reads as
                                    // continuous time rather than as missing data.
                                    height: b.count === 0 ? '2px' : `max(3px, ${pct}%)`,
                                }}
                            />

                            {pins.length > 0 && (
                                <span
                                    aria-hidden
                                    className={[
                                        'pointer-events-none absolute inset-y-0 left-0 w-px',
                                        pins[0].kind === 'release'
                                            ? 'bg-brand-dark/60 dark:bg-brand-accent'
                                            : 'bg-global-red/70',
                                    ].join(' ')}
                                >
                                    {pins[0].kind === 'release' && (
                                        <span className="absolute -top-1 -left-[2px] block h-[5px] w-[5px] rounded-full bg-brand-dark dark:bg-brand-accent" />
                                    )}
                                </span>
                            )}

                            {active && (
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-dark px-2 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-white dark:text-brand-dark">
                                    {b.count} {b.count === 1 ? unitLabel.replace(/s$/, '') : unitLabel} ·{' '}
                                    {dayjs(b.start).format(hourly ? 'HH:mm' : 'D MMM')}
                                    {pins.map((p) => (
                                        <span key={p.label} className="block font-semibold">
                                            ⬤ {p.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-[2px] border-t border-gray-200 pt-1.5 dark:border-white/10">
                {buckets.map((b, i) => (
                    <div key={b.start} className="flex-1 text-center">
                        {i % tickEvery === 0 && (
                            <span className="font-mono text-[10px] text-gray-400">{labelFor(b.start)}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventVolumeChart;
