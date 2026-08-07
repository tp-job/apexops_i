# Progress — Sprint 4: source maps & releases

Spec: [`build-spec.md`](build-spec.md) · Ledger: [`feature-list.json`](feature-list.json)

## 2026-08-04 — P0 complete, 12/13 features verified. One P1 item cut and named.

The sprint goal was *"a minified stack frame resolves to the original file, line and function."*
It does, against a real Vite build.

**Built**

| Layer | Files |
| --- | --- |
| Schema | `SourceMap` model in `database/prisma/schema.prisma`, pushed |
| Server | `lib/stackFrames.ts` (parser), `lib/sourcemaps.ts` (symbolicator + LRU), `api/sourcemaps.ts` (upload/list/delete/releases), wired into `api/issues.ts` and mounted in `api/projects.ts` |
| Client | `components/common/StackPanel.tsx`, `components/common/SourceMapsPanel.tsx`, `services/sourcemaps.ts`, types, and the settings + issue-detail wiring |
| Docs | `content/docs.tsx` — a Source maps section and a corrected `data-release` row |
| Dependency | `source-map@0.7.4` pinned into `app/server` (npm had deduped a hoisted 0.5.7) |

**Decisions worth keeping**

- **Maps live in Postgres, not on disk.** `server.ts` already serves `public/` statically for the SDK.
  A filesystem store would be permanently one misconfigured path away from publishing a customer's
  source — the worst outcome available in this feature. In a column there is no URL that serves it:
  the failure mode is removed by construction rather than by vigilance.
- **The request body *is* the map.** No multipart, no envelope, no `multer`. The recipe is one
  `curl --data-binary`, which is the difference between a feature people wire into CI and a feature
  people mean to wire into CI.
- **Read time, not ingest time.** Maps routinely arrive *after* the first errors of a deploy. Resolving
  on read means an upload retroactively fixes stored events — proven in verification by ingesting the
  crash first and uploading second.
- **Match on release + file basename.** Basename so one upload works from a CDN, a subpath or
  localhost; release exactly, because that is the entire job `data-release` exists to do.
- **`sourcesContent` is deliberately not returned.** Keeping *"uploaded source never leaves the
  server"* as a flat, testable invariant is worth more this sprint than a code-context panel. v1.1 can
  relax it consciously; it must not be relaxed by accident.
- **Fail open, everywhere.** Corrupt map, missing map, wrong release, unparseable stack — all return
  the raw frame and a 200. The issue detail is what people open during an incident.

**Verified against the running stack**, with a real Vite-minified bundle throwing a real `TypeError`
captured by the real SDK:

```
at s (…/index-B1R05hzO.js:1:740)      →  ../../src/cart.js:4:22        (the .reduce line)
at u (…/index-B1R05hzO.js:1:797)      →  computeCartTotal   cart.js:8
at l (…/index-B1R05hzO.js:1:824)      →  renderCartSummary  main.js:5
at   (…/index-B1R05hzO.js:1:889)      →  boot               main.js:9
```

Plus: 17 API assertions (authorization including the ingest key, validation, size cap, replace
semantics, the no-content-leak checks); corrupt-map and cache-eviction fail-open; the documented curl
run verbatim; and the UI toggle, settings panel and docs checked in-browser with no console errors.
`tsc --noEmit` clean on both workspaces, `vite build` green.

## Cut, and named rather than dropped

**F013 — first-seen-in-release + regression-in-a-newer-release.** The plan calls P1 the honest cut;
this is the half of it that needs its own G0 decisions rather than an implementation. Two of them:

1. *First seen in release* needs a per-issue release denormalization — the `Issue` row has no release
   and deriving it per read is a scan of `events`.
2. *Regression in a newer release* needs release **ordering**, and there is no correct ordering for
   arbitrary version strings. `cart@4.2.0` vs `cart@4.10.0` vs a git SHA vs a build number are four
   different schemes. Picking one silently is how a "regression" badge starts lying.

F012 (the release list) **was** built, because it is what makes the source-map feature falsifiable:
the settings panel now says which live releases have no maps.

## Known gaps

1. **No automated tests.** Same as the last two sprints — there is no test runner in either workspace.
   `lib/stackFrames.ts` is a pure function and `clearSourceMapCache()` exists as a seam; both are the
   first things worth covering when one is added.
2. **The LRU is per process.** Multiple API instances each hold their own; that is correct but means
   cache-hit ratios are per-instance. Fine at this scale, worth knowing before horizontal scaling.
3. **Only `latestEvent` is symbolicated**, not the ten in `recentEvents`. Deliberate — nobody scrolls
   ten symbolicated stacks — but if the detail view ever renders per-event stacks, this is the line to
   revisit.
