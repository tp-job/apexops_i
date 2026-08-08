# Progress — Sprint 9: the two admin surfaces

Spec: [`build-spec.md`](build-spec.md) · Ledger: [`feature-list.json`](feature-list.json)
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

## Status

| G | Scope | State |
|---|---|---|
| G1 | `DocPage` model, migration, six pages converted to Markdown | not started |
| G2 | Markdown + directive renderer over `DocsPrimitives` | not started |
| G3 | `/docs` served from the DB, published-only, still anonymous | not started |
| G4 | Admin CRUD API + `/admin/docs` editor, preview, reorder | not started |
| G5 | `monitors` admits admins only | not started |
| G6 | `/admin/console` page: targets, stream, filter, pause, buffer | not started |
| G7 | Tests, the two reintroduced-bug proofs, sidebar `ready`, docs | not started |

**Nothing is implemented yet. No criterion has been observed.**

## Carried risk

**G1 is the item most likely to run long, and the easiest to underestimate.** Converting 929 lines of
JSX across eleven distinct primitives is a task with judgment in it, not a regex — the SDK page in
particular should be expected to need hand-finishing. It is also the gate that makes
`content/docs.tsx` dead code, so the JSX becomes recoverable only from git. The file stays in the tree
until F010 passes and is deleted in the same commit that flips the switch.

Two environment gotchas that have already cost time: `prisma generate` EPERMs on Windows unless the
:3000 dev server is stopped first, and `npm run build` catches client errors that `tsc --noEmit`
misses here (the `erasableSyntaxOnly` gap). Both are in the criteria rather than in anyone's memory.
