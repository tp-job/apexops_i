# Progress Log — Notes SSOT, Phase 3

Newest session first. Written at teardown, read at bootstrap.

**Spec:** `.agents/docs/features/notes-ssot-blueprint.md` (§4 schema, §6 edge cases)
**Branch:** `sprint-12/notes-ssot-groundwork` — pushed, no PR yet

---

## Current state

- **Passing:** **10 / 10 — Phase 3 complete.**
- **Next:** Phase 4 — drop `Note.checklistItems`, but only after a full release in which nothing reads it. Nothing else in the blueprint is outstanding.
- **Phases 0–2 are done and merged into this branch already.** Phase 3 is the last build phase; Phase 4 (drop `checklistItems`) waits a full release.

## House mechanics — checked at Stage 2, do not re-derive

| Question | Answer |
|---|---|
| Schema changes | **`prisma db push`.** There is no `database/prisma/migrations/` directory; `migrate dev` would read a populated database as drifted and offer to reset it. |
| Gates | client: `typecheck lint test build` · server: `typecheck test build` |
| CI triggers | `pull_request` and `push: [main]` only — **a pushed feature branch runs nothing** |
| Commit triggers | checks only; the workflow never deploys |
| Harness path ignored? | No — `git check-ignore -v` on `.agents/harness/...` returns no match |

## Traps this phase has already hit

- **The `TimestampRepair` ledger blocked `db push` twice** with `relation "..._id_seq" already exists`. It was created by raw SQL originally, so its constraint and sequence names do not match what Prisma generates. Fixed by dumping its single row, dropping the table, letting `db push` create it, and restoring the row. **Keep it in the schema** — outside the schema, `db push` plans a `DROP TABLE`, and the script's own `create table if not exists` would then bring it back empty, silently re-arming a repair that must never run twice.
- **A wrong theory cost a cycle.** The first explanation for that failure — Prisma reserving underscore-prefixed table names for implicit m2m join tables — was plausible and wrong; renaming the table did not fix it. Deterministic recreation did.
- `User` has `firstName`/`lastName`, **no `name` field**. Two probe scripts failed on this.

## Sessions

### 2026-08-18 — F001 → F004 (the whole server half)

Steps for all ten features were written **before** any code, so none of them could be shaped to fit what was built.

- **F001** schema. `migrate diff --script` previewed before applying: additive only. Cascade proven inside a rolled-back transaction.
- **F002** events API. Cross-user isolation tested with two real sessions — the admin's DELETE returns 204 by design, so the check that matters is that the victim's event is **still there by name** afterwards, not that the call failed.
- **F003** overlap. The reason this is its own feature: matching on `startAt`'s day is the obvious implementation and it is wrong for every event that crosses midnight. Verified across eight consecutive days, including the boundary case that must *not* bleed.
- **F004** day endpoint. One call, one paint, one failure mode.

### 2026-08-18 (cont.) — F005, F006, F009

- **F005** month endpoint gained `tasksByDay` + `eventsByDay`, additively; `notesByDay` untouched.
- **A real disagreement surfaced here and was fixed.** The month grid buckets days via `zonedDayOfMonth` (the user's timezone) while the new day endpoint used a naive UTC window, so one event was reported on the 25th by one and the 26th by the other. Blueprint D4 says one question gets one answer: a `zonedDayRange` helper was added to `utils/timezone.ts` and the day endpoint now resolves in the user's zone. Cross-checked across five days afterwards — identical results.
- **That fix invalidated an earlier PASS, and the ledger says so.** F003's original "does not bleed into the next day" case used an event ending at 00:00 **UTC**, which in a +7 zone is 07:00 local and never near a day boundary. Re-tested with an event ending at 00:00 **local**: correct. The note records that the first instrument was measuring the wrong thing.
- **F006** day panel: three sections, always present, empty ones explicit. Added *above* the existing day-notes card rather than replacing it.
- **F009** event dialog, including the end-before-start refusal.

**Two instrument traps hit again this phase** — both cost a cycle, neither was a product bug:
1. A probe reported "dialog did not close" by counting DOM nodes. Radix keeps the node through its exit animation and this pane freezes those; `data-state` and `offsetParent` are the state.
2. `cat >` overwrote an existing `services/calendar.ts` because the file was never checked first. Recovered from git and verified byte-identical to HEAD; the new code went to `services/day.ts` where it belonged. **Check before writing, even for a "new" file.**

### 2026-08-18 (cont.) — F007, F008, F010 · phase complete

- **F007** day markers. Shape carries the meaning: circle/triangle/square, verified by computed style rather than by eye. Colour is reinforcement only.
- **F008** mini calendar + agenda strip on `/daily`. Reuses `useDayDetail` instead of fetching the day twice, and the same marker vocabulary as the month grid.
- **F010** gate: both workspaces green, style audit mutation-checked, test diff insertions-only.

**A third instrument trap, same family as the first two.** A classifier reported the triangle as a square because it tested `getComputedStyle().width === '0px'` — the triangle is `h-0 w-0` *with borders*, so its content box is zero while its border box is 6x5. The element was right and the probe was wrong. That is now three times in this project that a measurement, not the code, was the thing at fault; when a result looks wrong, check the instrument before the implementation.

**Design decision worth keeping:** `MiniMonth` is deliberately NOT the same component as the month grid on `/notes`. One is a working surface with note chips and a context menu; the other answers "where am I" in a 40% column. They share the marker vocabulary and nothing else — forcing one component to be both would have meant props that switch off half of it.

**Next session should** do nothing here. Phase 4 is a deletion that must wait a full release.
