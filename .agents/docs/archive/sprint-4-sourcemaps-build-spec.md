# Build spec — Sprint 4: source maps & releases

> G0 scope for the sprint named in
> [`planning/sprint-plan.md`](.agents/docs/planning/sprint-plan.md) §"Sprint 4 — Source maps &
> releases". No `features/` spec existed; this file is it.

## Problem statement

A production React build ships as `index-BwlN_KfP.js`. When it throws, the stack ApexOps stores reads:

```
TypeError: Cannot read properties of undefined (reading 'name')
    at Bt (https://app.example.com/assets/index-BwlN_KfP.js:48:12934)
```

`Bt` and `48:12934` are facts about the bundler's output, not about anyone's code. The issue detail
renders that string faithfully and it tells a developer nothing. **This is the item that decides
whether the tracker is usable against a real build at all** — every other feature shipped so far
assumes you can act on what you see, and against a minified bundle you cannot.

`Event.release` already exists and is populated: the SDK reads `data-release`, ingest stores it, and
the issue breakdown already tallies by it. It is the hook, and nothing has ever been hung on it.

## Acceptance criteria

1. An owner or admin can upload a `.map` for a **(project, release, file)** and get a `201`.
2. Uploading the same `(project, release, file)` again **replaces** it rather than accumulating rows.
3. On the issue detail, a stack frame whose file and release have an uploaded map is displayed as
   **original file, line, column and function name**, with a **view minified** toggle back to the raw
   frame.
4. A frame with **no matching map resolves to itself**, visibly and without an error — mixed stacks
   (vendor frames unmapped, app frames mapped) are the normal case, not an edge case.
5. **Symbolication never breaks the issue detail.** A corrupt map, a missing map, an unparseable
   stack, a map for the wrong release — every one of them returns the raw frame and a 200.
6. Symbolication is applied at **read time**, so a map uploaded after the errors arrived fixes events
   that are already stored.
7. Parsed maps are cached, and the cache **releases the memory it holds** on eviction.
8. **The uploaded map content is never readable through any endpoint** — not by the uploader, not by
   a project member, not with the ingest key, and not from the static origin that serves the SDK.
   Only *resolved positions* leave the server.
9. Upload is rejected above a size cap and rejected if the body is not a source map.
10. The docs carry a copy-pasteable upload recipe, and the `data-release` row stops calling source
    maps a future feature.

## Out of scope — deliberately

- **Returning `sourcesContent` (the original code lines) to the browser.** It is the single most
  valuable follow-up and it is deliberately not in v1: keeping *"uploaded source never leaves the
  server"* as a flat, testable invariant is worth more this sprint than a code-context panel. v1.1
  can relax it consciously; it must not be relaxed by accident.
- **Multipart upload / a CLI tool.** The map *is* JSON, so the body is the map and the recipe is one
  `curl --data-binary @file`. No `multer`, no temp-file lifecycle.
- **Symbolicating at ingest.** Ingest is the hot path, and maps routinely arrive *after* the first
  errors of a deploy. Read-time is both cheaper and more correct.
- **Server/Node stack symbolication.** Browser SDK only, as everywhere else.
- **P1 — release list, "first seen in release", regression-in-a-newer-release.** Listed in the ledger
  as stubs. The plan already names P1 as the honest cut; it is cut unless P0 lands with room.

## Design decisions

### D1 — Maps are stored in Postgres, not on disk

`server.ts` already does `app.use(express.static(path.join(__dirname, '../public')))` to serve the
SDK. A filesystem store is then permanently one misconfigured path, one `alias`, one helpful "let's
serve build artifacts too" commit away from publishing a customer's source. **In a Postgres column
there is no URL that serves it** — the failure mode is removed by construction rather than by
vigilance. Capped at 12 MB per map, which covers a large production bundle; the column is selected
*only* by the symbolicator and by nothing that returns a response body.

### D2 — The request body *is* the map

`POST /api/projects/:slug/sourcemaps?release=…&file=…`, `Content-Type: application/json`, body =
the `.map` file verbatim. `express.json({ limit })` is applied on this route only, so the 100 kB
default that protects every other route stays where it is. The recipe is one line, which is the
difference between a feature people wire into CI and a feature people mean to wire into CI.

### D3 — Frames match on release + file basename

A frame's URL is `https://app.example.com/assets/index-BwlN_KfP.js`; the build produced
`dist/assets/index-BwlN_KfP.js.map`. Matching on the **basename** means the same upload works whether
the bundle is served from a CDN, a subpath, or localhost. Matching on the full URL would make every
upload host-specific and would silently stop working the first time a CDN domain changed.
**Release must match exactly** — that is the entire job `data-release` exists to do. An event with no
release cannot be symbolicated, and the UI says so rather than pretending.

### D4 — Read-time, cached, and fail-open

Resolution happens when the issue detail is read. Parsed `SourceMapConsumer`s are held in a small LRU
(8 entries) keyed by source-map id, and **destroyed on eviction** — the `source-map` library holds
WASM memory that garbage collection does not reclaim, and this is the leak every naive integration
ships. Every failure path returns the raw frame: the issue detail is the surface people open *during
an incident*, and making it depend on the health of an uploaded artifact would be a self-inflicted
outage.

### D5 — Upload is owner/admin, JWT only

`canAdminister`, same as rotate-key and project settings. A `member` overwriting the map for a
release would silently corrupt everyone's stack traces. **The ingest key cannot reach this route at
all** — it is mounted under `/api/projects/:slug`, behind `authenticate` + `resolveMembership`.

## Failure behaviour

| Case | Behaviour |
| --- | --- |
| Event has no `release` | No symbolication attempted; UI says the release is missing and links to `data-release` |
| No map uploaded for that release | Raw frames, and the UI says which release had no maps |
| Some frames map, others don't | Per-frame — mapped frames resolve, unmapped ones render raw. The normal case |
| Map is corrupt / not a source map | Rejected at upload with a 400; if it somehow got in, resolution falls back per frame |
| Stack in an unrecognised format | Unparsed frames pass through as raw text |
| `mappings` has no entry for that position | That frame stays raw |
| Body over the cap | 413, with the cap named in the message |
| Same file uploaded twice | Second replaces the first (unique on project+release+file) |
| Project archived | Upload still allowed — you may be symbolicating history |

## Verification

The sprint's own exit line: **a minified stack frame resolves to the original file, line and
function.** Reproduced with a real bundle: build a tiny module with Vite (real minification, real
`.map`), throw from it, ingest the real stack through the SDK's own endpoint, upload the real map,
and read the issue detail.
