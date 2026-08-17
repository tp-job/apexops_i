/**
 * Renames existing daily notes to the spec's `Daily Note - [Date]` form.
 *
 * `lib/dailyTodos.ts` now generates that title for new days. Without this pass
 * the two formats sit side by side in Notes &amp; Calendar forever — every day
 * written before the change keeps `Daily note — 16 Aug 2026`, every day after
 * gets `Daily Note - 16 Aug 2026`, and the list looks like two different
 * features wrote it.
 *
 * **Safe to re-run.** It matches only the old shape and rewrites it to the new
 * one, so a second pass finds nothing. Unlike the timestamp repair, the
 * transformation is not relative to the current value, so it cannot compound.
 *
 * The date is preserved exactly as written rather than recomputed from
 * `scheduledFor`: a note whose title and schedule disagree is a real thing to
 * find out about, and silently rewriting the title would hide it.
 *
 *   npx ts-node -T src/scripts/rename-daily-notes.ts
 *   npx ts-node -T src/scripts/rename-daily-notes.ts --apply
 */

import prisma from '../lib/prisma';

const APPLY = process.argv.includes('--apply');

/** `Daily note — 16 Aug 2026` → `Daily Note - 16 Aug 2026`. */
const OLD = /^Daily note\s+—\s+(.+)$/;

async function main(): Promise<void> {
    console.log(APPLY ? 'mode: APPLY (writing)' : 'mode: DRY RUN (no writes)', '\n');

    const notes = await prisma.note.findMany({
        select: { id: true, title: true, tags: true, scheduledFor: true },
    });

    const daily = notes.filter(
        (n) => Array.isArray(n.tags) && (n.tags as unknown[]).includes('daily'),
    );

    let renamed = 0;
    let already = 0;
    for (const n of daily) {
        const m = OLD.exec(n.title);
        if (!m) {
            if (n.title.startsWith('Daily Note - ')) already += 1;
            else console.log(`  ${String(n.id).padStart(4)}  SKIP (unrecognised title): ${JSON.stringify(n.title)}`);
            continue;
        }
        const next = `Daily Note - ${m[1]}`;
        if (APPLY) await prisma.note.update({ where: { id: n.id }, data: { title: next } });
        console.log(`  ${String(n.id).padStart(4)}  ${JSON.stringify(n.title)} -> ${JSON.stringify(next)}`);
        renamed += 1;
    }

    console.log(
        `\n${daily.length} daily note(s); ${renamed} ${APPLY ? 'renamed' : 'to rename'}, ${already} already correct.`,
    );
    if (!APPLY && renamed > 0) console.log('Re-run with --apply to write.');
}

main()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
