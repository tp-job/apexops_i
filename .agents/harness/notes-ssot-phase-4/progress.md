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
