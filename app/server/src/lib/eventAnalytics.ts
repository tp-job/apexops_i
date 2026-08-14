import { Prisma } from '@prisma/client';
import prisma from './prisma';

/**
 * Shared time-series aggregation over `events`.
 *
 * Extracted from the issue-detail histogram so the project overview reuses the
 * exact same bucketing instead of a second copy. The copy is the thing to avoid
 * here: the timestamp handling below is subtle enough that a reimplementation
 * would get it wrong, and wrong in a way that returns *plausible* empty charts.
 */

export type Range = '24h' | '7d' | '30d';

export const RANGE_HOURS: Record<Range, number> = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 };

export interface Bucket {
    start: string;
    count: number;
}

export interface Window {
    /** Aligned to the bucket boundary so the first bar is a whole bucket. */
    since: Date;
    stepMs: number;
    hourly: boolean;
    unit: 'hour' | 'day';
}

export function windowFor(range: Range): Window {
    const hourly = range === '24h';
    const stepMs = (hourly ? 1 : 24) * 3600_000;
    const raw = Date.now() - RANGE_HOURS[range] * 3600_000;
    return {
        since: new Date(Math.floor(raw / stepMs) * stepMs),
        stepMs,
        hourly,
        unit: hourly ? 'hour' : 'day',
    };
}

/**
 * Fills gaps so quiet periods render as quiet rather than as missing data — a
 * chart that simply omits empty buckets is narrower *and* lies about the shape.
 */
function fillFrom(counts: Map<number, number>, w: Window): Bucket[] {
    const out: Bucket[] = [];
    const end = Math.floor(Date.now() / w.stepMs) * w.stepMs;
    for (let t = w.since.getTime(); t <= end; t += w.stepMs) {
        out.push({ start: new Date(t).toISOString(), count: counts.get(t) ?? 0 });
    }
    return out;
}

function fill(rows: { bucket: Date; count: bigint }[], w: Window): Bucket[] {
    const counts = new Map<number, number>();
    for (const r of rows) {
        // COUNT() returns BigInt from Postgres and does not survive
        // JSON.stringify — same trap as `Event.id`.
        counts.set(new Date(r.bucket).getTime(), Number(r.count));
    }
    return fillFrom(counts, w);
}

/**
 * **Timestamps are bound as `${iso}::timestamp`, never as a JS `Date`.**
 *
 * `events.created_at` is `timestamp without time zone` holding UTC wall-clock,
 * and this database's session timezone is not UTC. Binding a `Date` makes the
 * driver shift it by the session offset, so the window boundary lands hours away
 * and real events fall outside it — measured directly: the identical query
 * returned 0 rows with a `Date` and 1 with this cast. Reading is not symmetric;
 * `date_trunc` results already match the stored wall-clock.
 */
export async function eventVolumeByIssue(issueId: number, range: Range): Promise<Bucket[]> {
    const w = windowFor(range);
    const rows = await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
        SELECT date_trunc(${w.unit}, "created_at") AS bucket, COUNT(*) AS count
        FROM "events"
        WHERE "issue_id" = ${issueId}
          AND "created_at" >= ${w.since.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
    `;
    return fill(rows, w);
}

export async function eventVolumeByProject(projectId: number, range: Range): Promise<Bucket[]> {
    const w = windowFor(range);
    const rows = await prisma.$queryRaw<{ bucket: Date; count: bigint }[]>`
        SELECT date_trunc(${w.unit}, "created_at") AS bucket, COUNT(*) AS count
        FROM "events"
        WHERE "project_id" = ${projectId}
          AND "created_at" >= ${w.since.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
    `;
    return fill(rows, w);
}

/**
 * The same histogram as `eventVolumeByProject`, for **many projects at once**.
 *
 * One grouped query rather than a loop over `eventVolumeByProject`. The caller is
 * `GET /rollup` — the first screen after sign-in — and that handler is written
 * throughout to avoid N+1 because the cost there is felt immediately once someone
 * has more than a couple of projects. A per-project loop would put it straight back.
 *
 * Every project id asked for comes back in the map, including ones with no events
 * at all: an absent key and an all-zero series are different claims, and the
 * caller should not have to guess which it is holding.
 */
export async function eventVolumeByProjects(
    projectIds: number[],
    range: Range
): Promise<Map<number, Bucket[]>> {
    const out = new Map<number, Bucket[]>();
    if (!projectIds.length) return out;

    const w = windowFor(range);
    // See the note on `eventVolumeByIssue`: the bound is `${iso}::timestamp`, never
    // a JS Date. A Date shifts by the session offset and quietly returns nothing.
    const rows = await prisma.$queryRaw<{ project_id: number; bucket: Date; count: bigint }[]>`
        SELECT "project_id", date_trunc(${w.unit}, "created_at") AS bucket, COUNT(*) AS count
        FROM "events"
        WHERE "project_id" IN (${Prisma.join(projectIds)})
          AND "created_at" >= ${w.since.toISOString()}::timestamp
        GROUP BY 1, 2
        ORDER BY 1, 2
    `;

    const byProject = new Map<number, Map<number, number>>();
    for (const r of rows) {
        const counts = byProject.get(r.project_id) ?? new Map<number, number>();
        counts.set(new Date(r.bucket).getTime(), Number(r.count));
        byProject.set(r.project_id, counts);
    }

    // Built from `projectIds`, not from the returned rows — a project with zero
    // events in the window still gets a full, gap-filled series of zeroes.
    for (const id of projectIds) {
        out.set(id, fillFrom(byProject.get(id) ?? new Map(), w));
    }
    return out;
}

export interface ReleaseMarker {
    release: string;
    /** First time this release was ever seen for the project, not just in-window. */
    firstSeenAt: string;
    /** Events attributed to it inside the current window. */
    eventsInWindow: number;
}

/**
 * Release markers to pin onto the volume chart.
 *
 * This is the whole reason the overview earns its place: the issue list can say
 * *what* is broken, but only this can answer **"did the spike start with a
 * deploy?"** — the first question anyone asks when a graph turns upward.
 *
 * `firstSeenAt` is the global first sighting, deliberately not clamped to the
 * window: a release that shipped last week and is still erroring should pin at
 * its real start, and the caller drops markers that fall outside the visible
 * range. Clamping here would draw every old release at the left edge and imply
 * they all deployed at once.
 */
export async function releaseMarkers(projectId: number, range: Range): Promise<ReleaseMarker[]> {
    const w = windowFor(range);
    const rows = await prisma.$queryRaw<
        { release: string; first_seen: Date; in_window: bigint }[]
    >`
        SELECT
            "release",
            MIN("created_at") AS first_seen,
            COUNT(*) FILTER (
                WHERE "created_at" >= ${w.since.toISOString()}::timestamp
            ) AS in_window
        FROM "events"
        WHERE "project_id" = ${projectId} AND "release" IS NOT NULL AND "release" <> ''
        GROUP BY "release"
        ORDER BY first_seen DESC
        LIMIT 20
    `;

    return rows.map((r) => ({
        release: r.release,
        firstSeenAt: new Date(r.first_seen).toISOString(),
        eventsInWindow: Number(r.in_window),
    }));
}

/** Regressions (resolved → recurred) inside the window, per project. */
export async function regressionCount(
    projectId: number,
    range: Range
): Promise<number> {
    const w = windowFor(range);
    return prisma.issueStatusChange.count({
        where: {
            projectId,
            reason: 'regression',
            // Prisma's query builder converts timestamps correctly on its own —
            // only raw SQL needs the cast above.
            createdAt: { gte: w.since },
        },
    });
}

/** Shared shape for "how many issues are in each state" across both surfaces. */
export async function issueStatusCounts(where: Prisma.IssueWhereInput) {
    const rows = await prisma.issue.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
    });
    const of = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return {
        unresolved: of('unresolved'),
        resolved: of('resolved'),
        ignored: of('ignored'),
        total: rows.reduce((sum, r) => sum + r._count._all, 0),
    };
}
