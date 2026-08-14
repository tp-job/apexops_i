import type { FC } from 'react';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { IssueRange, RollupProject } from '@/types/projects';

interface Props {
    projects: RollupProject[];
    range: IssueRange;
    /** Rows beyond this fold into a "+N more" line. */
    maxRows?: number;
}

/**
 * Sequential ramp: **one hue, light → dark**, over five steps.
 *
 * Zero gets its own step that is not simply "step one, fainter". A cell with no
 * events and a cell the chart has no data for must not look the same — the
 * distinction between *quiet* and *missing* is the one this page has already been
 * burned by (see the `lastEventAt === null` handling in the projects table).
 */
const RAMP = [
    'bg-brand-dark/15 dark:bg-brand-accent/15',
    'bg-brand-dark/35 dark:bg-brand-accent/35',
    'bg-brand-dark/55 dark:bg-brand-accent/55',
    'bg-brand-dark/75 dark:bg-brand-accent/75',
    'bg-brand-dark dark:bg-brand-accent',
];
const QUIET = 'bg-black/[0.04] dark:bg-white/[0.05]';

const stepFor = (count: number, max: number): number => {
    if (count === 0 || max === 0) return -1;
    const ratio = count / max;
    if (ratio <= 0.2) return 0;
    if (ratio <= 0.4) return 1;
    if (ratio <= 0.6) return 2;
    if (ratio <= 0.8) return 3;
    return 4;
};

/**
 * Event volume as projects × time.
 *
 * The question this answers and the roll-up table does not: **when** did a project
 * get loud, and did anything else get loud at the same moment. A table sorted by
 * volume cannot show simultaneity; two rows lighting up in the same column is a
 * shared dependency or a shared deploy, and it is visible here at a glance.
 *
 * Cells are scaled to the **global** maximum across every visible row, not per
 * row. That is the opposite of the row sparklines, and deliberately so: this chart
 * exists to compare projects against each other, so a busy project must actually
 * look busier. Per-row scaling would make every project's worst hour equally dark
 * and quietly destroy the comparison.
 *
 * Hand-rolled like `EventVolumeChart` — `recharts` is a dependency but unused
 * app-wide, and a second charting idiom is not worth three fixed-shape charts.
 */
const ProjectHeatmap: FC<Props> = ({ projects, range, maxRows = 8 }) => {
    const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

    const rows = projects.slice(0, maxRows);
    const hidden = projects.length - rows.length;
    const hourly = range === '24h';

    const buckets = rows[0]?.series ?? [];
    const max = useMemo(
        () => rows.reduce((m, p) => p.series.reduce((n, b) => Math.max(n, b.count), m), 0),
        [rows]
    );

    const tickEvery = Math.max(1, Math.ceil(buckets.length / 6));
    const labelFor = (iso: string) => (hourly ? dayjs(iso).format('HH:mm') : dayjs(iso).format('D MMM'));

    // No buckets means the range produced no axis at all — an empty grid with a
    // legend claims to have measured something. Render nothing instead.
    if (!rows.length || !buckets.length) return null;

    const active = hovered ? rows[hovered.row]?.series[hovered.col] : null;
    const activeProject = hovered ? rows[hovered.row] : null;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[3px]">
                {rows.map((p, rowIdx) => (
                    <div key={p.id} className="flex items-center gap-3">
                        <span
                            className="w-28 shrink-0 truncate text-right text-[11px] text-gray-500 dark:text-gray-400"
                            title={p.name}
                        >
                            {p.name}
                        </span>

                        <div className="flex flex-1 gap-[3px]">
                            {p.series.map((b, colIdx) => {
                                const step = stepFor(b.count, max);
                                const isActive =
                                    hovered?.row === rowIdx && hovered?.col === colIdx;

                                return (
                                    <div
                                        key={b.start}
                                        className="relative flex-1"
                                        onMouseEnter={() => setHovered({ row: rowIdx, col: colIdx })}
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        <div
                                            className={[
                                                'h-5 rounded-[3px] transition-colors',
                                                step === -1 ? QUIET : RAMP[step],
                                                isActive
                                                    ? 'ring-2 ring-brand-dark/40 dark:ring-white/50'
                                                    : '',
                                            ].join(' ')}
                                        />

                                        {isActive && active && activeProject && (
                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-dark px-2 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-white dark:text-brand-dark">
                                                <span className="block font-semibold">
                                                    {activeProject.name}
                                                </span>
                                                {active.count} event{active.count === 1 ? '' : 's'} ·{' '}
                                                {dayjs(active.start).format(hourly ? 'HH:mm' : 'D MMM')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time axis. Sized as its own band so the labels are never clipped by
                a fixed plot height. */}
            <div className="flex items-center gap-3">
                <span className="w-28 shrink-0" aria-hidden />
                <div className="flex flex-1 gap-[3px] border-t border-gray-200 pt-1.5 dark:border-white/10">
                    {buckets.map((b, i) => (
                        <div key={b.start} className="flex-1 text-center">
                            {i % tickEvery === 0 && (
                                <span className="font-mono text-[10px] text-gray-400">
                                    {labelFor(b.start)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* An unlabelled colour ramp is decoration. Stating the top of the
                    scale is what turns the shading back into a measurement. */}
                <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    fewer
                    <span className={`h-2.5 w-4 rounded-[2px] ${QUIET}`} aria-hidden />
                    {RAMP.map((c, i) => (
                        <span key={i} className={`h-2.5 w-4 rounded-[2px] ${c}`} aria-hidden />
                    ))}
                    more
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    darkest = {max} event{max === 1 ? '' : 's'} in one{' '}
                    {hourly ? 'hour' : 'day'}
                </span>
                {hidden > 0 && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        +{hidden} more project{hidden === 1 ? '' : 's'} not shown
                    </span>
                )}
            </div>

            {/*
              * The values behind the colour, as a real table.
              *
              * A continuous colour scale is unreadable to anyone who cannot separate
              * the steps, and a tooltip is not an answer because it is unreachable
              * without a pointer. This is the same data, exactly, in a form a screen
              * reader and a keyboard can walk.
              */}
            {/*
              * `sr-only` goes on a wrapping div, never on the table itself.
              *
              * A table will not shrink below its min-content width — `width: 1px`
              * is simply ignored — so an `sr-only` table stays as wide as its 31
              * columns (measured at ~1673px) while being absolutely positioned.
              * Clipped, so invisible, but still able to push the page's scroll
              * width out and produce a stray horizontal scrollbar. A div honours
              * the 1px box and clips the table inside it, which is what makes the
              * hiding actually free.
              */}
            <div className="sr-only">
            <table>
                <caption>Events per {hourly ? 'hour' : 'day'} by project</caption>
                <thead>
                    <tr>
                        <th scope="col">Project</th>
                        {buckets.map((b) => (
                            <th key={b.start} scope="col">
                                {dayjs(b.start).format(hourly ? 'HH:mm' : 'D MMM')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <tr key={p.id}>
                            <th scope="row">{p.name}</th>
                            {p.series.map((b) => (
                                <td key={b.start}>{b.count}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default ProjectHeatmap;
