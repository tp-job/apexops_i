/**
 * Manual retention prune.
 *
 *   npm run prune:events --workspace app/server
 *
 * The same prune runs automatically in-process (`lib/retention.ts`); this exists
 * so it can be triggered deliberately — after lowering a project's retention
 * window, or to reclaim space without waiting for the daily tick.
 *
 * Safe to run any time: it only deletes `Event` rows already past their project's
 * window, and never touches `Issue` aggregates.
 */
import 'dotenv/config';
import prisma from '../lib/prisma';
import { pruneExpiredEvents } from '../lib/retention';

async function main(): Promise<void> {
    const before = await prisma.event.count();
    const result = await pruneExpiredEvents();
    const after = await prisma.event.count();

    console.log(`✔ Scanned ${result.projectsScanned} project(s)`);
    console.log(`✔ Deleted ${result.eventsDeleted} event(s) — ${before} → ${after}`);
}

main()
    .catch((err) => {
        console.error('Prune failed:', err);
        process.exit(1);
    })
    .finally(() => {
        void prisma.$disconnect();
    });
