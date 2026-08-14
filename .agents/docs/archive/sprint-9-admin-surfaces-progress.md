# Progress — Sprint 9: the two admin surfaces

Spec: [`build-spec.md`](sprint-9-admin-surfaces-build-spec.md) · Ledger: [`feature-list.json`](sprint-9-admin-surfaces-feature-list.json)
Decisions: [`admin-docs-and-console.md`](.agents/docs/features/admin-docs-and-console.md)

Sprint 8 was scoped on 2026-08-07 and never started. Its spec, ledger, progress and decisions are
archived **intact** at
[`.agents/docs/archive/sprint-8-realtime-issue-stream-*`](.agents/docs/archive/) and are re-scopeable
as written — nothing was built against them, so nothing about them is stale.

---

## 2026-08-08 — scoping

Scoped from *"make Documentation, console monitor of feature admin"* — the two disabled `soon` rows in
the Administration group, the only unfinished entries in the app shell.

**Both were verified against the tree before anything was written.** The two features turned out to be
unfinished for opposite reasons, and that shaped the whole sprint:

| Checked | Result |
|---|---|
| `routes/AppRoutes.tsx` | `/admin/users` is the **only** admin route. Neither new row has one |
| `content/docs.tsx` | 929 lines of hand-authored **JSX**, six pages, eleven primitives |
| `pages/Docs.tsx` | Public surface fully shipped — three-column shell, TOC, prev/next |
| `server.ts:130-151, 234-267` | `monitors` room, `target-app` registry, capped `console-logs` relay — **all live** |
| `hooks/useBugTrackerSocket.ts` | Consumes all four events with a JWT handshake — and has **zero call sites** |
| `server.ts:136-140` | The `monitors` room admits **any signed-in user**, not just admins |

So Documentation is a storage-format change first and a UI second — a CMS cannot store JSX, which is
why it was never built. Console Monitor is nearly complete plumbing missing a page, plus one
authorization level.

**Gates and decisions written before any code.** Eight decisions locked (`S9-D1`…`S9-D8`), 21
acceptance criteria, 11 ledger features, all `passes: null`.

Three calls worth stating here because the sprint is shaped around them:

1. **All six pages migrate; the DB becomes the only source.** The cheaper option — DB pages appended
   alongside six hardcoded ones — produces a sidebar with two invisible classes of page, where an
   admin can add a page but cannot fix a typo in Quickstart. That is a CMS that does not do the thing
   a CMS is for.
2. **G5 (the admin gate on `monitors`) lands before G6 (the page).** Gate-after means the insecure
   version is the one that exists longest and the one most likely to get demoed. The hook has no call
   sites, so tightening it now regresses nothing.
3. **Escaping is not optional and not deferrable.** `/docs` is public and unauthenticated on purpose
   — the SDK snippet lives there. Admin-authored Markdown reaching `dangerouslySetInnerHTML` turns one
   compromised admin account into stored XSS on the most public page in the product.

## 2026-08-08 — console slice built (G5, G6)

Scope call from the user: **build the Console Monitor half first.** The docs half (F001–F006)
stays queued exactly as specced; nothing about it changed.

G5 landed before G6 deliberately. Gate-after would have meant the insecure version was the one that
existed longest and the one most likely to get demoed.

**What the verification actually cost, and why it was worth it.** Three things were found by running
the checks rather than by reading the code:

1. **`source` was not rendered.** Criterion 11 names it explicitly. Caught by reading the live panel
   against the criterion rather than against my memory of what I had built. Added as its own column
   and to the copy output.
2. **`@types/socket.io-client@1.4.36`** was declared in the client — v1 types shadowing the v4 types
   that ship with the package. Invisible until the server typechecked a file importing the client.
   Removed; both workspaces are clean.
3. **The naive dead-feed test was a confound.** Killing the backend also kills the session check, so
   the page unmounts to "Checking your session…" and the badge cannot be observed at all. The honest
   test is a *live API with a dead socket* — done by pointing `VITE_WS_URL` at a closed port.

The suite proved its worth before being trusted: reverting the role check to authenticated-only
turned 4 tests red naming the privilege gap, then reverted clean.

## 2026-08-09 — docs CMS built (G1–G4), G7 closed

The other half. Storage format first, UI second, exactly as the sprint was shaped.

**What the migration actually cost.** The conversion was hand-written into six `.md` files and
seeded by `scripts/seed-docs.ts` — the estimate said "a conversion with judgment in it, not a regex",
and that was right. Two calls made during it, recorded rather than buried:

1. **The dialect gained two things the decisions did not name.** An inline `:endpoint[GET /path]`
   form, because the REST API page puts endpoint chips *inside table cells* where a block directive
   cannot go; and a `{w-44}` width suffix on table header cells, because `DocsPrimitives.Table` takes
   per-column widths and dropping them would have visibly reflowed four tables. Both are additions to
   S9-D1's syntax, not departures from it.
2. **The lead is the content before the first `##`**, rather than a stored `intro` column. One less
   field to keep in sync, and it reads the way the file looks.

**Criterion 1 was verified by diff, not by screenshot.** The Browser pane could not composite frames
in this session, so no screenshot could be taken — and a screenshot was the weaker instrument anyway.
Instead the pre-migration JSX was restored from git and rendered through the same primitives, and its
text was compared with the migrated Markdown rendered through the new path. **Five of six pages came
back byte-identical.** The sixth, `sdk`, differs by 16 characters in exactly one place: the old file's
template literal treated `\` + newline as a line continuation, so the shipped source-map `curl` snippet
had its backslashes and line breaks silently eaten. The migration restores the intended multi-line
command. That is a fix, and it is written here rather than left for someone to find as a regression.

**Three things were found by running the checks rather than by reading the code:**

1. **A backup filename collision destroyed a file mid-proof.** `DocsMarkdown.tsx` and
   `docsMarkdown.ts` backed up to `/tmp/DocsMarkdown.bak` and `/tmp/docsMarkdown.bak` — the same file
   on Windows. The restore put the parser's contents into the renderer, and five tests stayed red
   after a "clean" revert. Case-insensitive filesystems do not respect a naming convention that only
   differs by case.
2. **`eslint` refuses the control-character class** in `sanitizeHref`, which is the part doing the
   security work. Suppressed with the reason inline rather than by weakening the regex.
3. **A 404 on a draft slug had to be the same 404 as a missing slug.** Anything else — a 403, a
   distinct message — tells an anonymous visitor which unpublished pages exist.

The suite proved its worth before being trusted, on both halves: the monitors gate reverted to
authenticated-only turned 4 server tests red, and the two docs defences reverted turned 8 client
tests red. Both reverted clean.

## Status

| G | Scope | State |
|---|---|---|
| G1 | `DocPage` model, migration, six pages converted to Markdown | **done** — F001 |
| G2 | Markdown + directive renderer over `DocsPrimitives` | **done** — F002, F003 |
| G3 | `/docs` served from the DB, published-only, still anonymous | **done** — F004 |
| G4 | Admin CRUD API + `/admin/docs` editor, preview, reorder | **done** — F005, F006 |
| G5 | `monitors` admits admins only | **done** — F007, wire-verified 5/5 |
| G6 | `/admin/console` page: targets, stream, filter, pause, buffer | **done** — F008, F009 |
| G7 | Tests, the two reintroduced-bug proofs, sidebar `ready`, docs | **done** — F010, F011 |

**Observed, not claimed: all 21 criteria.** 10–18 on 2026-08-08 (console); 1–9 and 19–21 on
2026-08-09 (docs), with criterion 1 verified by rendering diff rather than by screenshot — see above
for why, and for the one intentional 16-character difference.

Suites: server 61 passed, client 44 passed. `tsc`, `eslint src` and `npm run build` clean in both
workspaces.

## Carried risk

**F012 is the residual on the console half.** A socket joins the `monitors` room once and stays, so a
demoted admin keeps streaming until that socket drops. `authorize()` re-reads the role on every HTTP
request; there is no equivalent tick on a long-lived socket. It is strictly narrower than what shipped
before — the room used to admit any signed-in user at all — so this is a window, not a hole. It is on
the ledger rather than in a comment.

**The JSX is now only in git.** `content/docs.tsx` was deleted in the commit that flipped `/docs` to
the database — the risk named at scoping, now realized deliberately rather than by accident. The six
Markdown sources live on at `app/server/src/scripts/docs-content/`, and `npm run seed:docs` rebuilds
the rows from them; note that it re-seeds the SEED text, not whatever an admin has since edited, so it
is a floor and not a backup. Editing the live pages is now `/admin/docs`, not the repository.

Two environment gotchas that have already cost time: `prisma generate` EPERMs on Windows unless the
:3000 dev server is stopped first, and `npm run build` catches client errors that `tsc --noEmit`
misses here (the `erasableSyntaxOnly` gap). Both are in the criteria rather than in anyone's memory.

## 2026-08-09 — refactor pass (F013–F015)

Scoped from what the sprint actually left behind, not from a general tidy-up. Three duplications, each
appended to the ledger with its own verification steps before any code moved, so the refactor is
recorded the same way a feature is.

- **F013 — one docs article renderer.** S9-D3's promise is that preview and public cannot disagree,
  and that promise was resting on two copies of the same 25-line loop. Now structural.
- **F014 — one route-id parser.** Both copies existed because `Number.parseInt('3abc')` is `3`: a
  permissive id parser does not fail, it returns *someone else's row*. The shared one is stricter than
  either copy was.
- **F015 — one admin refusal panel.** Three hand-rolled copies of a refusal is three chances for one
  of them to reassure someone the API is about to turn away.

**Refactors were proven, not asserted.** The public page's rendered HTML was captured before the
extraction and compared after: 29 901 characters, identical, no first difference. Preview vs public
re-measured: still byte-identical. The malformed-id and per-route 403 checks were re-run on the wire
with a fresh token rather than assumed to still hold.

Suites after: server 65 passed, client 44 passed. `tsc`, `eslint src`, `npm run build` clean in both
workspaces.
