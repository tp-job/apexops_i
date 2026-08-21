# Progress — Notes SSOT, Phase 4: drop `Note.checklistItems`

**Spec:** [`notes-ssot-blueprint.md`](../../docs/features/notes-ssot-blueprint.md) §8 phase 4, EC-06
**Ledger:** [`feature-list.json`](feature-list.json) · **Branch:** `notes-ssot/phase-4-drop-checklist-items`

Phase 3's log is at [`../sprint-12-notes-ssot/progress.md`](../sprint-12-notes-ssot/progress.md) —
10/10, closed 2026-08-18. Phase 3.5 (`/daily` folded into `/notes` + `/tasks`) closed 2026-08-19.

---

## 2026-08-21 — opened

Phase 4 is the one phase that was deliberately *not* done with the rest: the blueprint parks it
behind **"no code has read this column for a full release."** That condition is what this session
checks first, because the phase is a `DROP COLUMN` and there is no undo from inside the app.

### What the blueprint's own row already knew

> `useDailyTodos.ts` (the last fallback reader) was deleted with phase 3.5, **but `notes.ts` on the
> server still accepts and returns this column.**

So the precondition was *nearly* true and the row said so honestly. The remaining readers are the
ones this phase removes.

### The release condition, stated rather than assumed

This repo's CI runs checks and **never deploys** — there is no release train to count releases
against. Read literally, "wait one full release" can never become true here. Read for its intent —
*no deployed client is still writing to that column, and no row still needs it* — it is checkable,
and that is what P4-01 checks: every reader in the tree, plus the actual rows in the database.

**The ordering requirement this creates is the real risk, and it outlives this branch:** a database
that never ran the Phase 1 migration still holds todos only in `checklistItems`, and after this
change there is no code left that can read them. That has to be stated in the blueprint, not just
in a commit message.

---

## 2026-08-21 — closed, 7/7

The phase ran in the order the ledger fixed: **audit, then removal, then the drop.**

### The audit changed nothing, and that was the point

Zero rows held an unmigrated todo — all 8 notes carried exactly `[]`, the column default. Had one
row held a todo with no `Task`, P4-01's failure case says stop, and the phase would have ended there
with a migration to run instead of a column to drop.

**`prisma db push` refused anyway**, reporting *"8 non-null values"* — it counts NULLs, not empty
arrays, so a column defaulted to `[]` reads as fully populated. That refusal is worth keeping in
mind: it is not evidence of data, and it is also not noise to wave through. The contents were dumped
to a backup file before re-running with `--accept-data-loss`, even though the dump proved the data
was `[]` eight times over.

### What went with the column

Not just the field. The one-shot migration script and its server-side reader were deleted in the
same change, because a script that reads a dropped column is not a safety net — it is a script that
fails at runtime, months later, in front of whoever was counting on it. What replaces it is a
sentence in the blueprint: **run Phase 1's migration before deploying Phase 4**, and if you truly
need the script, check out the commit before this one.

On the client, `normalizeTodos` and `serializeTodos` went, and with them four private helpers that
existed only to serve them and 9 test assertions. A suite that still covers a deleted function is
not coverage, it is a fossil.

### Left deliberately alone

`lib/dailyTodos.ts` still exports about a dozen functions with **zero callers** — `addTodo`,
`toggleTodo`, `renameTodo`, `moveTodo`, `filterTodos`, `todoProgress`, `findDailyNote` and friends.
That is Phase 3.5 fallout (the `/daily` page they served is gone), not Phase 4's column. Removing
them here would have made the diff look like a cleanup and hidden the drop inside it. Flagged
separately instead.
