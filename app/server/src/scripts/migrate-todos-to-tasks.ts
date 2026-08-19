/**
 * Moves todos out of `Note.checklistItems` and into the `tasks` table
 * (blueprint phase 1, US-10).
 *
 * **Nothing is deleted.** `checklistItems` is left exactly as it is: it stays the
 * fallback while the client rolls over, and is dropped in phase 4 once nothing
 * reads it. That also means this migration is reversible by truncating `tasks`.
 *
 * **Idempotent by construction.** A note that already has task rows is skipped,
 * and the unique `(userId, clientId)` index is a second line of defence. This is
 * deliberate: the `+7h` repair script in this folder taught the lesson the hard
 * way — a second run of a "fix" that keys on relative state silently corrupts
 * data, so anything that writes in bulk has to be safe to run twice.
 *
 * Dry run by default. Pass `--apply` to write.
 *
 *   npx ts-node -T src/scripts/migrate-todos-to-tasks.ts
 *   npx ts-node -T src/scripts/migrate-todos-to-tasks.ts --apply
 */

import prisma from '../lib/prisma';
import { normalizeTodos, type LegacyTodo } from '../lib/legacyTodos';

const APPLY = process.argv.includes('--apply');

/** Local noon, matching `dayAnchor` in `api/tasks.ts` and `Note.scheduledFor`. */
const dayAnchor = (d: Date): Date => {
    const key = d.toISOString().slice(0, 10);
    return new Date(`${key}T12:00:00.000Z`);
};

async function main(): Promise<void> {
    console.log(APPLY ? 'mode: APPLY (writing)' : 'mode: DRY RUN (no writes)', '\n');

    const notes = await prisma.note.findMany({
        where: { userId: { not: null } },
        select: {
            id: true,
            userId: true,
            title: true,
            checklistItems: true,
            scheduledFor: true,
            createdAt: true,
        },
        orderBy: { id: 'asc' },
    });

    let sourceTodos = 0;
    let toCreate = 0;
    let created = 0;
    let skippedNotes = 0;
    let emptyNotes = 0;

    for (const note of notes) {
        const todos: LegacyTodo[] = normalizeTodos(note.checklistItems);
        if (todos.length === 0) {
            emptyNotes += 1;
            continue;
        }
        sourceTodos += todos.length;

        const already = await prisma.task.count({ where: { noteId: note.id } });
        if (already > 0) {
            console.log(`  note ${String(note.id).padStart(4)}  SKIP — already has ${already} task(s)`);
            skippedNotes += 1;
            continue;
        }

        // A note with no `scheduledFor` was never planned for a day; the calendar
        // already falls back to `createdAt` for exactly these rows, so the tasks
        // land on the same day the note appears on rather than nowhere.
        const anchor = dayAnchor(note.scheduledFor ?? note.createdAt);

        console.log(
            `  note ${String(note.id).padStart(4)}  ${todos.length} todo(s) -> ${anchor.toISOString().slice(0, 10)}  ${JSON.stringify(note.title.slice(0, 40))}`,
        );
        toCreate += todos.length;

        if (!APPLY) continue;

        await prisma.$transaction(
            todos.map((t, index) =>
                prisma.task.create({
                    data: {
                        userId: note.userId!,
                        // The legacy id is preserved, not regenerated: the client
                        // keys its rows on it, so a fresh id would remount every
                        // row and break an in-flight edit.
                        clientId: t.id,
                        text: t.text,
                        isDone: t.checked,
                        completedAt: t.checked && t.completedAt ? new Date(t.completedAt) : t.checked ? anchor : null,
                        scheduledFor: anchor,
                        position: index,
                        noteId: note.id,
                        ...(t.createdAt ? { createdAt: new Date(t.createdAt) } : {}),
                    },
                }),
            ),
        );
        created += todos.length;
    }

    console.log('');
    console.log(`notes scanned          : ${notes.length}`);
    console.log(`  with no todos        : ${emptyNotes}`);
    console.log(`  already migrated     : ${skippedNotes}`);
    console.log(`todos found in JSON    : ${sourceTodos}`);
    console.log(`tasks ${APPLY ? 'created        ' : 'that would be created'}: ${APPLY ? created : toCreate}`);

    if (APPLY) {
        // The count that matters is not "did it run" but "is anything missing".
        const total = await prisma.task.count({ where: { deletedAt: null } });
        const expected = sourceTodos;
        const migrated = await prisma.task.count({ where: { noteId: { not: null }, deletedAt: null } });
        console.log(`tasks now in the table : ${total} (${migrated} linked to a note)`);
        if (migrated < expected) {
            console.log(`\n⚠ MISMATCH: ${expected} todos in JSON but only ${migrated} tasks linked to notes.`);
            process.exitCode = 1;
        } else {
            console.log('\n✔ every todo found in JSON has a task row.');
        }
    } else {
        console.log('\nRe-run with --apply to write.');
    }
}

main()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
