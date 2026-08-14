# Admin Documentation editor & Console Monitor — decisions

Sprint 9. Spec: [`build-spec.md`](../archive/sprint-9-admin-surfaces-build-spec.md) · Ledger: [`feature-list.json`](../archive/sprint-9-admin-surfaces-feature-list.json)

These are the calls that were genuinely undecidable from the code, locked before implementation.
The spec does not restate them; it references them by id.

---

## Context, verified against the tree on 2026-08-08

Both features exist today only as disabled rows in
[`Sidebar.tsx:49-50`](../../../app/client/src/components/layouts/Sidebar.tsx), marked `soon`. Neither
has a route in `routes/AppRoutes.tsx`; `/admin/users` is the only admin route wired.

**Documentation.** A complete public docs surface already ships at `/docs/*`
(`pages/Docs.tsx`, three-column shell, prev/next, TOC). Its content is **929 lines of hand-authored
JSX** in `content/docs.tsx` — six pages, whose `sections[].body` are React nodes built from eleven
primitives in `components/docs/DocsPrimitives.tsx` (`Lead`, `C`, `Code`, `Callout`, `Table`,
`Endpoint`, …). So `/admin/docs` is not "build docs". It is a CMS over content that currently cannot
be stored in a database at all.

**Console Monitor.** The plumbing is already there and already hardened:

| Piece | State |
|---|---|
| `monitors` room, authenticated join | `server.ts:130-143` — refuses an unauthenticated socket |
| `target-app` registry + connect/disconnect fan-out | `server.ts:144-151`, `:263-267` |
| `console-logs` relay, capped at `MAX_RELAYED_LOGS` | `server.ts:234-256` |
| `GET /api/console-logs/targets` | `server.ts:385` |
| Client hook consuming all four events with a JWT handshake | `hooks/useBugTrackerSocket.ts` |

`useBugTrackerSocket` has **zero call sites** — an orphan left by the 2026-07-24 UI reset. What is
missing is the page, not the transport. A prior standalone implementation is documented at
[`archive/console-monitor.md`](../archive/console-monitor.md): tabs per app, level filter,
pause/copy/clear, auto-scroll, a stats row. That defines the intended UX; this sprint ports it into
the app shell.

---

## S9-D1 — Docs are stored as Markdown plus a directive syntax, and all six pages migrate

JSX cannot round-trip through a textarea, so the stored format has to be text. Plain Markdown was
rejected: `Callout`, `Endpoint` and `Table` carry most of what makes the SDK and Quickstart pages
readable, and losing them is a visible downgrade to ship alongside a feature that is supposed to be
an improvement.

So: **Markdown, plus container directives** (`:::callout{tone=warn title="…"}`, `:::endpoint{method=POST path=/api/…}`)
that render through the *existing* `DocsPrimitives`. One rendering path, not two.

**All six pages migrate into the database.** The alternative — DB pages appended alongside six
hardcoded ones — was rejected because it produces a sidebar with two invisible classes of page, where
an admin can add a page but cannot fix a typo in Quickstart. That is a CMS that does not do the thing
a CMS is for.

## S9-D2 — The table of contents is derived from headings, never stored

`DocSection` today is a hand-authored `{ id, title, level, body }`. Storing that shape in the DB means
two editable structures to keep in sync. Instead the body is one Markdown string, and the renderer
extracts `##`/`###` headings into the `DocsToc` shape at read time, with anchors slugified from the
heading text.

**Consequence, stated rather than discovered:** anchor ids change from the hand-authored ones. Any
existing deep link into a `#section` may break. Accepted — the anchors are three weeks old and not
published anywhere external.

## S9-D3 — Draft and published are distinct; `/docs` serves published only

An editor with no draft state means every keystroke saved is live to the public. The public route
filters to `published`; the admin preview renders a draft through the identical renderer, so preview
is a guarantee rather than an approximation.

## S9-D4 — Markdown renders through an allowlist; raw HTML never passes through

`/docs` is **public and unauthenticated** (see the header comment in `pages/Docs.tsx` — this is
deliberate, the SDK snippet lives there). Piping admin-authored Markdown into
`dangerouslySetInnerHTML` therefore turns one compromised admin account into stored XSS on the most
public page in the product.

Raw HTML in source is escaped, not rendered. Link `href`s are restricted to `http:`, `https:`,
`mailto:` and same-origin relative paths — `javascript:` is dropped.

## S9-D5 — The `monitors` room gates on `role === 'admin'`, not merely on being signed in

Today the room refuses anonymous sockets but accepts **any authenticated user**, and it carries every
target app's console output. The sidebar files this feature under Administration and the route is
`/admin/console`; the transport has to agree with that, or hiding the link is the only thing standing
between a regular user and every app's logs — which the file's own comment already warns is
presentation, not access control.

Role is read from the database at join time, the same way `authorize()` does it, never from a JWT
claim (see [`sprint-5-settings-roles`](../archive/sprint-5-settings-roles-build-spec.md)).

Safe to tighten: the hook has no call sites, so nothing regresses. The **anonymous `target-app` path
stays open** — the SDK depends on it.

## S9-D6 — Console logs stay ephemeral

`server.ts:249-255` is explicit that the `prisma.log.create` fan-out was removed and persistence has
exactly one supported path: `POST /api/ingest`, which is keyed, rate limited, size capped and project
scoped. This sprint does not reopen that. The monitor is a **live view with a client-side ring
buffer** — 500 entries, matching the existing cap — and says so in the empty state, so nobody reads a
blank panel as "no errors ever happened".

## S9-D7 — Pause freezes the view, and keeps buffering

A pause that unsubscribes silently drops whatever arrived while paused, which is the worst behaviour
a debugging tool can have: it loses exactly the burst you paused to read. Pause holds the rendered
list still while incoming logs continue to fill the buffer, and the resume control shows the count
waiting.

## S9-D8 — Slug edits are allowed and leave no redirect (exit notes below)

Renaming a slug breaks any existing link to it. v1 permits the edit behind a confirmation that names
the consequence. A redirect table is a real feature with its own semantics and is **out of scope**,
recorded here so it is a decision rather than an oversight.

---

# Exit notes — 2026-08-09

Both halves shipped. The console half landed 2026-08-08 (F007–F009); the documentation CMS landed
2026-08-09 (F001–F006, F010, F011). All 21 acceptance criteria were observed. What follows is what
the decisions above turned into, and where implementation refined them.

## Where the implementation refined a decision

**S9-D1 gained two pieces of syntax.** The decision named `:::callout{…}` and `:::endpoint{…}`. Two
additions were needed by the content itself:

- **Inline `:endpoint[GET /api/projects]`** — the REST API page puts endpoint chips *inside table
  cells*, where a block-level directive cannot go. The block form still works and is used on the SDK
  page.
- **A `{w-44}` width suffix on table header cells** — `DocsPrimitives.Table` takes per-column widths,
  and four tables visibly reflow without them.

**The page lead is the content before the first `##`**, not a stored column. S9-D2's argument against
storing the TOC applies identically to storing an intro: it is a second structure that can disagree
with the first.

## Where the escaping ended up (S9-D4)

Stronger than the decision required. There is no escaping *step* — the parser returns a typed tree and
the renderer emits React children, so no HTML string exists anywhere in the path. `dangerouslySetInnerHTML`
appears in the codebase's docs path exactly zero times, and the file that would host it says so.

The proof is on **rendered output** via `renderToStaticMarkup`, not on the parse tree, because the tree
proves what the parser decided and the renderer is where the hole would be reintroduced.

`sanitizeHref` is an allowlist (`http`, `https`, `mailto`, same-origin relative) and strips control
characters *before* reading the scheme — `java\tscript:` and `java\nscript:` are live links in parsers
that check the raw string.

## The one deliberate visual change

Criterion 1 was verified by restoring the deleted JSX from git, rendering it through the same
primitives, and diffing its text against the migrated Markdown. **Five of six pages: byte-identical.**
The SDK page differs by 16 characters, and the migration is the correct one: the old template literal
treated `\` + newline as a JavaScript line continuation, so the shipped source-map `curl` snippet had
its backslashes and line breaks eaten. A reader copying it got a broken command.

## What is now true that was not

- Editing the public documentation is `/admin/docs`, not a commit and a deploy.
- `/docs` is still anonymous. That was a criterion precisely because migrations quietly break it.
- Both Administration rows are `ready: true`, and both routes refuse a non-admin server-side —
  asserted per route, not on one representative.

## Still open

- **F012** — a demoted admin keeps the `monitors` stream until that socket drops. Sized medium; the
  window closes on any reconnect, deploy or token refresh.
- **No redirect table** for renamed slugs (S9-D8). The rename is confirmed with its consequence named;
  the redirect remains out of scope and a decision rather than an oversight.
