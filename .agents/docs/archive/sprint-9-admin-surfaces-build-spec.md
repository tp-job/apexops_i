# Build spec — Sprint 9: the two admin surfaces

Ledger: [`feature-list.json`](sprint-9-admin-surfaces-feature-list.json) · Log: [`progress.md`](sprint-9-admin-surfaces-progress.md)
**Decisions live in [`admin-docs-and-console.md`](.agents/docs/features/admin-docs-and-console.md)**
(`S9-D1`…`S9-D8`). This file does not restate them.

Sprint 8 was scoped and never started; its spec, ledger, progress and decisions are archived intact
at [`.agents/docs/archive/sprint-8-realtime-issue-stream-*`](.agents/docs/archive/) and are
re-scopeable as written.

---

## 1. Problem statement

Two rows in the Administration group render disabled with a `soon` badge
([`Sidebar.tsx:49-50`](app/client/src/components/layouts/Sidebar.tsx)). Neither has a route. They are
the only unfinished thing in the app shell, and each is unfinished for a different reason.

**Documentation** is unfinished because it was never possible. The public `/docs/*` surface ships and
is good, but its six pages are 929 lines of hand-authored JSX in `content/docs.tsx`. Editing the
product's documentation currently requires a developer, a commit and a deploy. An admin CMS over
content that lives in a `.tsx` file is not a small feature — it is a storage-format change first
(S9-D1) and a UI second.

**Console Monitor** is unfinished for the opposite reason: nearly all of it exists. The authenticated
`monitors` room, the `target-app` registry, the capped `console-logs` relay and
`GET /api/console-logs/targets` are all live in `server.ts`, and `hooks/useBugTrackerSocket.ts`
already consumes every event with a JWT handshake. The hook has **zero call sites** — it is an orphan
from the 2026-07-24 UI reset. What is missing is a page.

It is also missing an authorization level. The `monitors` room refuses anonymous sockets but accepts
**any signed-in user**, and it carries every target app's console output. Shipping an
Administration-labelled route over that transport unchanged would make the hidden sidebar link the
only thing protecting those logs — the failure mode `Sidebar.tsx:26` explicitly warns about.

**Sprint goal:** *an admin can edit every page of the public documentation without a deploy, and
watch live console output from connected apps — with the transport's authorization matching the
label on the door.*

## 2. Acceptance criteria

Every one is an observation, not an implementation claim. A criterion that cannot fail proves nothing.

**Documentation**

1. All six existing pages render at `/docs/*` **from the database**, with `content/docs.tsx` no longer
   the source. Callouts, endpoint chips, code blocks and tables look as they did before — compared
   against a screenshot taken before the migration, not from memory.
2. `/docs` is still reachable **signed out**. The migration does not quietly put the SDK install
   instructions behind a login.
3. An admin edits Quickstart's body at `/admin/docs`, publishes, reloads `/docs/quickstart` — the
   change is there. No rebuild, no restart.
4. A page saved as **draft** does not appear at `/docs/*` and does not appear in the public sidebar.
   Requesting its slug directly redirects to the default page rather than rendering it.
5. Admin preview of a draft renders through the **same** renderer as the public page — verified by
   diffing the rendered output of one page in both surfaces, not by eye.
6. Reordering pages within a group in the admin UI changes the public sidebar order on reload.
7. **XSS, proven not asserted.** A page whose body contains `<img src=x onerror=alert(1)>` and a link
   with `href="javascript:alert(1)"` renders both as inert text/dropped href. Asserted in a test on
   the rendered output.
8. The table of contents on every migrated page lists the same headings the JSX version did, and each
   anchor scrolls to its heading clear of the sticky header.
9. A non-admin `GET`/`PUT`/`POST`/`DELETE` against every `/api/admin/docs*` route gets 403, asserted
   per route, not on one representative.

**Console Monitor**

10. `/admin/console` shows every connected target app, and a target app connecting or disconnecting
    updates that list within 2s without a reload.
11. A `console.error` in a connected target app appears in the panel within 2s, once, with its level,
    timestamp, source, app name and stack.
12. Level filter, copy, clear and auto-scroll behave as
    [`archive/console-monitor.md`](.agents/docs/archive/console-monitor.md) describes.
13. **Pause keeps buffering** (S9-D7). Pause, generate 20 logs, resume — all 20 are there and the
    resume control showed a pending count while paused.
14. The buffer holds at most 500 entries and drops oldest first; the panel does not degrade after
    5 000 logs in a session.
15. **The authorization criterion.** A signed-in **non-admin** socket emitting
    `register {clientType:'monitor'}` is refused and receives **zero** `console-logs` frames.
    Asserted on the wire, not by checking the UI is empty.
16. **The SDK is unharmed.** An anonymous `target-app` socket still registers and still relays. The
    admin gate on `monitors` did not tighten `io.use` as a side effect.
17. Killing the server puts the connection badge in a disconnected state; it never reads connected
    over a dead feed. Restart reconnects and the target list is correct.
18. Console logs are still **not persisted**: after a session with hundreds of logs, `SELECT count(*)
    FROM logs` is unchanged (S9-D6).

**Both**

19. Both sidebar rows are `ready: true`, and a non-admin sees neither the rows nor a route — the route
    itself refuses, not just the rail.
20. `tsc --noEmit`, `eslint src` and `npm run build` clean in **both** workspaces; `npm test` green.
    Note `npm run build` catches errors `tsc --noEmit` misses in this client — the
    `erasableSyntaxOnly` gap.
21. **FAILURE CASE, proven not declared:** revert the `monitors` admit check to authenticated-only and
    show a test goes red naming the privilege gap; separately, revert the HTML escaping and show the
    XSS test goes red. Both revert clean and the suite goes green. Same discipline as Sprint 7's F011.

## 3. Gates

| G | Scope | Exit |
|---|---|---|
| **G1** | `DocPage` model + migration + a one-time script migrating the six JSX pages to Markdown (S9-D1) | Criterion 1 (data present) |
| **G2** | Markdown + directive renderer over the existing `DocsPrimitives`, with the escaping allowlist (S9-D2, S9-D4) | Criteria 7, 8 |
| **G3** | Public read path: `/docs/*` served from the DB, published-only, still anonymous | Criteria 1, 2, 4 |
| **G4** | Admin CRUD API, `authorize('admin')` on every route + `/admin/docs` editor, preview, reorder (S9-D3, S9-D8) | Criteria 3, 5, 6, 9 |
| **G5** | `monitors` admit gates on `role === 'admin'` (S9-D5) | Criteria 15, 16 |
| **G6** | `/admin/console` page: target list, stream, filter, pause, buffer (S9-D6, S9-D7) | Criteria 10–14, 17, 18 |
| **G7** | Tests, the two reintroduced-bug proofs, sidebar `ready`, docs | Criteria 19, 20, 21 |

**G5 before G6, deliberately.** Building the page first and gating after means the insecure version is
the one that exists longest and the one most likely to get demoed.

**Cut order if it runs long:** admin reorder (G4) degrades to an integer `order` field edited as a
number → the console stats row degrades to a total count → tabs-per-app degrade to a single merged
stream with an app-name column. **Do not cut G5, and do not cut the escaping in G2.** Both are the
kind of thing that ships silently and is found by someone else.

## 4. Estimate

2.5–3d. G1's content migration is the item most likely to run long and the easiest to underestimate:
929 lines of JSX with eleven distinct primitives is a conversion with judgment in it, not a regex.
Budget it as a gate that produces a reviewable diff, and expect to hand-finish the SDK page.

## 5. Known risks, named before the start

- **The migration is one-way in practice.** Once `/docs` reads from the DB, `content/docs.tsx` is
  dead code and the JSX is only recoverable from git. Keep it in the tree until G7 passes, then delete
  it in the same commit that flips the switch — not before, and not "later".
- **Prisma generate will EPERM on Windows** if the dev server on :3000 is running. Stop it before the
  G1 migration. This has cost time twice.
- **The docs are public and the editor is not.** Every criterion about escaping (7) and draft
  visibility (4) exists because those two facts meet on the same rendered page.
