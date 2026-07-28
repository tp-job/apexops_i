import prisma from './prisma';

/**
 * Event retention (spec D5).
 *
 * A tracker with no TTL is a disk-space incident with a UI. `Event` is the one
 * table with a credible path to 10^8 rows, so pruning is a v1 deliverable rather
 * than a follow-up ticket.
 *
 * Only raw `Event` rows expire. `Issue` aggregates are never pruned — the count,
 * first-seen and last-seen of a bug are the durable record, and they are tiny.
 * An issue whose events have aged out still reads correctly; it just has no
 * sample payloads left to inspect.
 */

/** Rows per DELETE. Bounded so a large prune cannot hold a long lock. */
const BATCH = 5_000;

export interface PruneResult {
    projectsScanned: number;
    eventsDeleted: number;
}

export async function pruneExpiredEvents(): Promise<PruneResult> {
    const projects = await prisma.project.findMany({
        select: { id: true, retentionDays: true },
    });

    let eventsDeleted = 0;

    for (const p of projects) {
        const cutoff = new Date(Date.now() - p.retentionDays * 86_400_000);

        // Loop in batches rather than one unbounded deleteMany. The first prune
        // after a busy period can span millions of rows, and a single statement
        // there blocks writes on the table the SDK is actively posting into.
        for (;;) {
            const doomed = await prisma.event.findMany({
                where: { projectId: p.id, createdAt: { lt: cutoff } },
                select: { id: true },
                take: BATCH,
            });
            if (!doomed.length) break;

            const { count } = await prisma.event.deleteMany({
                where: { id: { in: doomed.map((d) => d.id) } },
            });
            eventsDeleted += count;

            if (doomed.length < BATCH) break;
        }
    }

    return { projectsScanned: projects.length, eventsDeleted };
}

/**
 * Schedules the prune in-process.
 *
 * In-process on purpose: this project has no job runner, and adding one to delete
 * old rows would be the largest piece of infrastructure in the repo. The tradeoff
 * is that a multi-instance deployment would run it once per instance — harmless,
 * because the work is idempotent, but worth knowing before scaling out.
 *
 * Runs once shortly after boot (so a long-stopped instance catches up) and then
 * daily. `unref()` so it never keeps the process alive.
 */
export function scheduleRetentionPrune(): void {
    const DAY = 86_400_000;

    const run = async () => {
        try {
            const r = await pruneExpiredEvents();
            if (r.eventsDeleted > 0) {
                console.log(`🧹 Retention: deleted ${r.eventsDeleted} event(s) across ${r.projectsScanned} project(s)`);
            }
        } catch (err) {
            // Never throw out of a timer — an unhandled rejection here would take
            // the server down for a housekeeping failure.
            console.error('Retention prune failed:', err);
        }
    };

    const kickoff = setTimeout(run, 60_000);
    kickoff.unref();

    const daily = setInterval(run, DAY);
    daily.unref();
}
