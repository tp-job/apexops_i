# Notes + Calendar — feature spec (G0 scope lock)

> Status: **scope locked 2026-07-26**. Owner: product + full-stack.
> Built as **one page**, per [`user-flow.md`](../product/user-flow.md) Finding 2. Rebuild step 3.

## Problem statement

Notes has the richest surviving backend in the app — full CRUD, a stats aggregate, and four intact
client hooks — and no screen. The Calendar shares its data rather than having its own model.

The finding that reshaped this spec: **the calendar was not a calendar.**
`GET /api/notes/calendar/:year/:month` bucketed notes by `createdAt`, and `Note` had no date field
of any kind. It could only ever answer *"what did I write that day"* — there was no way to put
anything on a future date. A user who drags a note onto next Tuesday expects it to stay there.

## Locked decisions

### D1 — `Note` gains `scheduledFor` and `dueDate`

`scheduledFor` is the day the note is planned for; `dueDate` is an independent deadline (plan
Monday, due Friday). Both nullable.

**A note's calendar date is `scheduledFor` when set, otherwise `createdAt`.** The fallback is
load-bearing: it means every pre-existing note stays exactly where it already appeared, so the
migration doesn't blank the calendar. Notes surfaced via the fallback carry `isScheduled: false`
so the UI can render them differently from things deliberately placed on a day.

### D2 — Day buckets resolve in the **user's** timezone

The old handler built month boundaries with `new Date(year, month - 1, 1)` — the *server's* local
zone. Two users in different zones saw the same note on different days, and relocating the server
would silently shift everyone's calendar. `User.timezone` already existed and was ignored.

Buckets now resolve against the viewer's zone via `utils/timezone.ts` (no new dependency — `Intl`
ships the IANA database). The response echoes the `timeZone` it used so the client isn't guessing.

### D3 — One page, not two

Already settled and already acted on in code: `useOptimizationCalendarEvents` is gone and
`useCalendarEvents` returns the richer shape. Density stays a mode toggle inside one page.

## Non-goals (v1)

- Recurring notes/events.
- Reminders or notification delivery (`UserSettings` has the flags; there is no delivery path).
- Multi-day or timed ranges — `scheduledFor` is an instant, rendered at day granularity.
- Sharing a note with another user. Notes are strictly single-owner and every query is
  `userId`-scoped; changing that is a permissions model, not a field.

## Success criteria

1. Create, edit, pin, colour, and delete a note from the page.
2. Place a note on a **future** date and have it persist there.
3. Two users in different timezones each see a note on the correct local day.
4. Notes written before this feature still appear on their creation day, marked unscheduled.
5. Month view renders correctly at zero notes, and across a month boundary and a DST transition.

## Status

| Gate | State |
|---|---|
| **G0** — this document | ✅ done |
| **G1** — schema + API + client contract | ✅ migration applied, typechecks clean, timezone unit-verified (12/12 incl. EST→EDT) |
| **G2** — the merged page UI | ✅ `pages/NotesCalendar.tsx` at `/notes`, verified in-browser against the real DB |
| **G3** — richer note editor (blocks, tags, colours) | ⬜ not started |

G2 verification: a note scheduled to **14 Aug** while the system date was 26 Jul persisted and
rendered on that exact cell of the August grid — the forward-planning case that was impossible
before `scheduledFor` existed.

### G1 detail

- `Note.scheduledFor` / `Note.dueDate` + `[userId, scheduledFor]` and `[userId, dueDate]` indexes.
- `utils/timezone.ts` — `resolveTimeZone` (parses the stored `"Asia/Bangkok (GMT+7)"` display
  format, falls back to UTC on anything unrecognised), `zonedMonthRange`, `zonedDayOfMonth`.
  Verified against Bangkok, UTC, New York, a year rollover, and the March EST→EDT jump.
- Calendar handler rewritten: validated params (was `parseInt` with no NaN guard → 500 on
  `/calendar/abc/xyz`), zone-aware buckets, `scheduledFor ?? createdAt` fallback.
- Route ids across notes now reject non-numeric input with 404 instead of passing `NaN` to Prisma.
- Client: `CalendarNoteApi` carries the new fields; `mapNotesToCalendarEvents` maps on
  `scheduledFor ?? createdAt`.

## Known risks

| Risk | Mitigation |
|---|---|
| `User.timezone` is a **display string** (`"Asia/Bangkok (GMT+7)"`), not a clean IANA id, and users can hold legacy values. | `resolveTimeZone` parses and validates, falling back to UTC rather than throwing. Long-term: store a bare IANA id. |
| A user changes timezone and their notes appear to shift day. | Correct behaviour (the instant didn't move), but worth a one-line note in Settings copy. |
| `GET /api/notes` returns **every** note with no pagination. | Fine at current scale; revisit before a user has thousands. |
