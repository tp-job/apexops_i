# Progress Log — AI Assistant (BYOK)

Newest session first. Written at teardown, read at bootstrap.
Written for a reader with zero memory of this build — because that is who reads it.

**Harness:** `.agents/harness/sprint-11-ai-assistant-byok/` (spec · ledger · this log)
**Branch:** `sprint-11/ai-assistant-byok` — **not yet created**

---

## Current state

- **Status:** Gate 3 open. Inner loop running.
- **Passing:** 10 / 20 features (F001–F005, F006, F007, F008, F009, F010)
- **Next:** **F011** (conversation UI) → F012 (KeyDialog) → F013 (a11y) → F014 (token audit) → F015 (build/test gate).
- **Server half complete and proven. Client data layer complete and proven headless.** What remains is UI only.
- **Acceptance criterion 2 (no key material anywhere) is verified** — see F006.
- **DB workflow:** `prisma db push` only. **Never `prisma migrate dev`** — see the F003 note.
- **Open gap:** F010's live resize swap is unproven — this browser pane fires no `resize`/matchMedia `change` events. Re-check on a real browser resize before Stage 4.
- **Branch:** `sprint-11/ai-assistant-byok` — **already existed and is checked out**, level with `main` (0 ahead / 0 behind)
- **Blocked on:** nothing
- **Next session should:** **F003** — the `UserAiKey` migration. Stop anything on `:3000` first (Windows EPERM).

> **Correction (2026-08-15).** The first version of this log claimed the working tree carried
> unrelated pre-existing modifications from Projects/Notes/Daily work. It does not — `git status`
> was clean at Gate 3, and the branch already existed rather than needing creation. Staging
> explicit paths instead of `git add -A` is still the rule; the reason given for it was wrong.

---

## Bootstrap (cold session)

```bash
npm run install:all
```

Then, before any Prisma work:

1. **Stop anything on `:3000`.** `prisma generate` throws EPERM on Windows while the dev server holds the client. Another project on this machine also claims `:3000`, which makes the ApexOps API 404 in a way that looks like a routing bug.
2. `npm run dev:server` / `npm run dev:client` — the root `dev` runs both.
3. Env: `.env.example` documents `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`. This build adds **`AI_KEY_SECRET`** (32 bytes, must differ from `JWT_SECRET`).
4. Read `build-spec.md` §6–§8 before touching `api/ai.ts`.

---

## Environment facts checked at Stage 2 (do not re-derive)

- **CI never deploys.** `.github/workflows/ci.yml` is checks-only by explicit written design, on `pull_request` and `push: [main]`. Invariant 11 satisfied: committing on this branch ships nothing.
- **Harness invariant 8 determination.** These files describe the encryption design, and they are tracked. The repo already tracks `security-hardening-2026-07-31.md` and `platform-hardening.md`, which are more detailed. So tracking these adds no new exposure class. **`gh` is not installed on this machine, so repo visibility was not confirmed** — if `tp-job/apexops_i` is public, that is a pre-existing condition affecting the existing security docs too, and worth a separate review. No secret is in any harness file (invariant 9).
- **No encryption precedent exists.** `grep createCipheriv|scrypt|ENCRYPTION_KEY` over `app/server/src` returns zero hits. `lib/crypto.ts` is genuinely new security-critical code, which is why it is F001 and why it is reviewed before anything builds on it.

---

## Sessions

### 2026-08-15 — F006 + F009 (leak scan + client data layer)

**Completed**
- **[F006]** Full-lifecycle leak scan ✅ — **acceptance criterion 2 is now proven**, not asserted.
- **[F009]** `types/assistant.ts`, `services/assistant.ts`, `hooks/useAssistant.ts` ✅ — 19 headless tests, client suite 115 green, `npm run build` green.

**The methodological lesson of this session: a negative result is worthless until the instrument is proven**
- The first leak scan used `preview_logs`, which reported "no logs matching AIzaSy". It also reported no match for strings that were **definitely** logged — so the capture was not live and the clean result proved nothing. Re-ran against a server started with stdout/stderr redirected to a file, and only trusted the scan after confirming the log *did* contain the handler lines. This is the same trap as the `.env`-not-reloading one earlier: **check that the test can fail before believing it passed.**
- Result once the instrument was trustworthy: full key 0 hits in response bodies and 0 in the server log; middle segment 0 and 0; `AIza` prefix 0 in the log; `ciphertext` 0 in bodies. The provider's own message *is* logged (`API key not valid...`) and the key never is — exactly the designed split.
- Browser storage scanned: no key material in localStorage, sessionStorage, IndexedDB or cookies.

**Three defects found by verification, all fixed**
1. **Vacuous tests.** The first draft of `assistant.test.ts` asserted failures with `await fn().catch(e => expect(...))` — which passes when nothing throws, because the assertion never runs. Rewritten as `rejects.toMatchObject`. Then **mutation-checked**: role mapping was changed to emit `assistant` and the trim was deleted; the suite failed exactly those two tests, then both were restored.
2. **`erasableSyntaxOnly`.** `constructor(public readonly detail)` is a TypeScript-only parameter property. `tsc --noEmit` accepted it; `npm run build` rejected it with **TS1294**. This is the documented reason the build, not the typecheck, is the gate for this client.
3. **`ai.ts` temporarily repointed** at an unreachable host to force the catch block (502 `PROVIDER_ERROR`, no URL, no key in the body). Restored and confirmed by an empty `git diff` plus a live `PONG`.

**Care note**
- A `Get-CimInstance | Where CommandLine -like '*server.ts*'` filter to kill dev servers matched my own shells too, because their command lines contained that string. Nothing was lost (all work had been committed as `f2a8f49`), but **match on process name and port, not on a substring of the command line.**

**Left undone**
- Uncommitted: `types/assistant.ts`, `services/assistant.ts`, `services/assistant.test.ts`, `hooks/useAssistant.ts`, harness.
- A background server is running with its log at `%TEMP%/f006-server.log`; the normal `preview_start {name:'server'}` can take over any time.

**Status:** 10 / 20 passing (50%)

**Next session should**
1. **F011** — conversation UI, wired to `useAssistant`. Markdown to React nodes via `lib/docsMarkdown`, never `dangerouslySetInnerHTML`.
2. **F012** — `KeyDialog` on the DS `Modal`, delete behind `ConfirmDialog`.

---

### 2026-08-15 — F007 + F008 (key resolution + typed errors)

**Completed**
- **[F007]** `resolveKey()` in `api/ai.ts` ✅ — BYOK → env → `NO_KEY`, with the caps still ahead of it.
- **[F008]** Typed error codes ✅ — all five observed live, additive to the existing `{ error }` shape.

**The defect this feature existed to catch, and the one it nearly shipped with**
- **Gemini answers HTTP 400 for a rejected key — not 401/403.** And a bad key is otherwise *identical* to a malformed payload: both are 400 with `error.status: 'INVALID_ARGUMENT'`. My first cut routed on the status code, so a user with a bad stored key got "Invalid request to AI service" — wrong, and unactionable, since nothing told them the fix was to re-enter their key. Caught because the verification asserted the expected **code**, not just a 4xx. Now keyed on `error.details[].reason === 'API_KEY_INVALID'`, measured from real provider responses rather than assumed from docs.
- Follow-on decision: a rejected **user** key → `400 INVALID_KEY` (actionable). A rejected **env** key → `503 PROVIDER_ERROR`. Telling a user their key is invalid when the org's key is the broken one sends them to delete a working credential.

**Decisions**
- **`api/ai.ts` moved off `?key=` onto the `x-goog-api-key` header.** The file's own catch block warned that a fetch error message can carry the request URL, and the URL carried the key. Now defence in depth rather than the only defence.
- **`validateChatBody` strictly before `resolveKey`.** Resolving is a database read *and* a decryption; doing it ahead of the caps would spend work on a request about to be refused, and would decrypt a credential for a request that had no business reaching the provider. Proved by timing: the oversize prompt is refused in **4ms**, where a real call takes >400ms.
- **A decrypt failure falls through to the env key**, never 500. A row under a rotated `AI_KEY_SECRET` means "no usable key", and the user should land on "add your API key".
- Responses now carry `keySource: 'user' | 'env'` — useful to the panel, and never the key itself.

**Method note worth keeping**
- `ts-node-dev` restarts on **source** change, not on `.env` change, so dotenv does not re-read. Testing `NO_KEY` and `RATE_LIMITED` needed a `touch src/server.ts` after editing `.env`. The first attempt silently tested nothing — every request returned 200 and it looked like a pass. Verified the env had actually taken by reading `GET /api/ai/status` before trusting the result.
- `AI_RATE_LIMIT_PER_HOUR=2` made the 429 observable without burning 30 requests of real quota. `.env` was backed up and restored; confirmed afterwards via `/api/ai/status` (`ready`, limits intact) and a live call returning `PONG`.

**Left undone**
- Uncommitted: `api/ai.ts`, `api/ai-key.ts`, `middleware/rateLimit.ts`, `server.ts`, `.agents/harness/`.

**Status:** 8 / 20 passing (40%)

**Next session should**
1. **F006** — the full-lifecycle leak scan; its dependencies are now met.
2. **F009** — client data layer, verified headless before any UI exists.

---

### 2026-08-15 — F004 + F005 (key API)

**Completed**
- **[F004]** `PUT /api/ai/key` ✅ and **[F005]** `GET`/`DELETE /api/ai/key` ✅ — `api/ai-key.ts`, mounted at `server.ts` **before** `aiRoutes` so `/api/ai/key` matches its own router. Verified against the running server with a real Gemini key.

**Decisions**
- **The key travels in the `x-goog-api-key` header, never `?key=`.** Google documents the query-parameter form, and `api/ai.ts:153–157` documents why that is dangerous here: a `fetch` failure's `err.message` can carry the request URL, and the URL carries the key. A header cannot end up in an error string, a redirect, or a proxy log that records paths only. **`api/ai.ts` still uses `?key=` and should be moved to the header as part of F007** — same fix, same reason, and it closes the leak the file already warns about.
- **`PROVIDER_UNREACHABLE` is 503, not 400.** A timeout is not proof the key is bad. Returning `INVALID_KEY` on a network blip would tell a user to delete a working credential.
- **Shape check before the network call.** Deliberately loose (length + no whitespace): being strict about a vendor's key format is how you reject a valid key the day the vendor changes it. The provider stays the authority.
- **`GET` returns `200 { key: null }`, not 404** — otherwise "no key yet" and "endpoint missing" are indistinguishable in the client's error handling.
- **`DELETE` is idempotent.** The caller wanted "no key stored"; that is the end state either way.

**Discovered**
- **Pre-existing IPv6 rate-limit bypass**, unrelated to this sprint. The server logs three `ERR_ERL_KEY_GEN_IPV6` validation errors at boot from `middleware/rateLimit.ts:44`, `:73`, `:96` — custom `keyGenerator`s use `req.ip` without the `ipKeyGenerator` helper, so **IPv6 clients can evade the limits**, including `aiChatLimiter`, which is one of the four controls this sprint depends on. Not caused by my changes; present before them. Needs its own fix.
- The list-models probe returns 50 models and confirms `gemini-2.5-flash` is available on the supplied key.

**Left undone**
- F006 (full lifecycle leak scan) needs F007/F008 first — the partial scan here already shows 0 leaks across every key-API response body.
- Uncommitted: `api/ai-key.ts`, `server.ts`, `schema.prisma`, `.agents/harness/`.

**Status:** 6 / 20 passing (30%)

**Next session should**
1. **F007** — `resolveKey()` in `api/ai.ts`, and move that file to the header form while you are in it.
2. **F008** — typed error codes, additive to the existing `{ error }` shape.

---

### 2026-08-15 — F003 (UserAiKey schema)

**Completed**
- **[F003]** `UserAiKey` model + `User.aiKey` back-relation, applied to the live database ✅ — all five ledger steps verified.

**Discovered — the spec was wrong, and it was the dangerous kind of wrong**
- **This repo has no `database/prisma/migrations/` directory and never has.** The prior sprint applied its schema change with `prisma db push` (`daily-note-rich-editor.md:162`). The spec said `prisma migrate dev`, which on a populated database with no migration history makes Prisma treat the schema as **drifted and offer to reset it** — i.e. drop the data. Caught by listing the migrations directory before running anything. Spec §11 now carries the corrected instruction and the reason.
- Method that made this safe and should be reused: **preview with `prisma migrate diff --script` before applying.** The output was one `CREATE TABLE`, one unique index, one cascade FK, and zero `DROP`/`ALTER` — which is what made `db push` obviously safe rather than probably safe.

**Decisions**
- **Behavioural checks ran inside rolled-back transactions**, then a residue count proved 0 stray rows and 0 stray users. Verifying a unique constraint by inserting real duplicate rows into a dev database leaves the next person's data slightly wrong, and the ledger would still say "verified".
- `provider` ships constrained to `'gemini'` in v1 (D3) — column now, abstraction later.

**Verified**
- 10 columns, correct types, `verified_at` nullable · unique index `user_ai_keys_user_id_key` · second insert for the same `user_id` rejected with **P2002** (failure case observed) · user delete leaves **0** key rows (cascade) · `tsc --noEmit` clean · 91 server tests green · `/api/health` reports database connected after restart.

**Two harness problems found at the end of this feature**
- **The whole harness was gitignored.** `.gitignore:33` carries a bare `build/`, and git matches that at *any* depth — so `.agents/build/` was untracked and never once appeared in `git status`. State that must survive a fresh clone was living only on one machine. Moved to `.agents/harness/`, verified tracked. The relative links to `../../docs/` still resolve because the depth is unchanged.
- **F001/F002/F010 were committed from outside this session** as `57b1cf3`, containing exactly the seven expected files. At Gate 3 the branch was clean and level with `main`, so that commit was created mid-session by the user or their tooling — worth knowing before assuming an uncommitted working tree.

**Left undone**
- `database/prisma/schema.prisma` (F003) and `.agents/harness/` are uncommitted.

**Status:** 4 / 20 passing (20%)

**Next session should**
1. **F004** — `PUT /api/ai/key`: shape check → provider **list-models** probe → encrypt → upsert. The probe must run *before* any write, and must not be a `generateContent` call.
2. **F005** — `GET`/`DELETE`, scoped to the caller, `ciphertext` never named in the `select`.

---

### 2026-08-15 — F010 (assistant rail + Topbar trigger)

**Completed**
- **[F010]** `AssistantPanel` + `AppLayout` right slot + `Topbar` trigger ✅ — all six ledger steps verified by DOM measurement. Details in the ledger note.

**Discovered — one real defect, found only because the step was measured**
- **Duplicate DOM id.** `xl:block` / `xl:hidden` are presentation only: both the rail and the drawer *mounted*, so two elements carried `id="assistant-panel"` and the trigger's `aria-controls` resolved ambiguously. Measured 2 matches before, 1 after. Fixed with `hooks/useMediaQuery.ts`, which decides which variant **exists** rather than which is painted. This is the class of bug that a screenshot review passes cleanly — both looked right.
- **The browser pane fires no `resize` or matchMedia `change` events.** A probe counted 0 of each across two viewport changes while `matchMedia(...).matches` itself flipped correctly. So the *listener* path in `useMediaQuery` is unproven here; the *mount decision* is verified at 1024 and 1440 via fresh loads. Recorded as a gap rather than assumed working.
- Screenshots fail on this machine ("pane is not displayed, not compositing frames") and synthetic clicks do nothing — everything was driven through `javascript_tool`. Consistent with the existing notes about this environment.
- **Stale console buffer.** `read_console_messages` kept returning a `ReferenceError: isDesktop is not defined` from the HMR window between two edits. Confirmed stale by checking the live DOM — the component renders and no error boundary is showing. Don't trust that buffer's recency; verify against the DOM.
- The ApexOps server **is** on `:3000` and its DB is connected, so the older note about another project owning that port did not apply today.

**Decisions**
- **Trigger placed at the head of the right-hand cluster** in `Topbar`, using `Sidebar`'s active-nav fill (`bg-brand-accent`) when open, so "this rail is open" reads identically on both sides of the shell.
- **Shipped the panel with the trigger, not a bare icon.** `Topbar`'s own comment — *"a control that does nothing is worse than no control"* — is why search is still absent there, and it applies equally here. The panel renders an honest empty state until F011 brings the conversation surface.
- **No `open` prop on `AssistantPanel`** (refactor step). `AppLayout` mounts it only while open, so the prop could only ever be `true`, and a prop that cannot vary eventually gets a branch built on it.

**Left undone**
- F010's live-resize gap, above.
- Still uncommitted. Client files: `components/layout/AssistantPanel.tsx`, `hooks/useMediaQuery.ts`, modified `AppLayout.tsx` and `Topbar.tsx`.

**Status:** 3 / 20 passing (15%)

**Next session should**
1. **F003** — `UserAiKey` migration. Stop `:3000` first.
2. **F004** — `PUT /api/ai/key` with the list-models probe before any write.

---

### 2026-08-15 — Gate 3 opened, F001 + F002

**Completed**
- **[F001]** `lib/crypto.ts` + `crypto.test.ts` ✅ — AES-256-GCM envelope encryption. Verified by 18 tests, full server suite 91 green, `tsc --noEmit` clean. **The tamper assertion was inverted to `.not.toThrow()`, observed failing, then restored** — so it is known load-bearing rather than assumed.
- **[F002]** `AI_KEY_SECRET` documented and guarded ✅ — verified by observing all three production refusals (missing / <32 chars / equal to `JWT_SECRET`) and the dev-mode shared-secret warning, in a real process rather than by reading the code.

**Decisions**
- **Followed `lib/jwtSecrets.ts` rather than the spec's "endpoints answer 503".** Production throws; dev warns and uses an obvious non-random fallback. The spec left this as an either/or and this resolves it: one rule for operators across both secrets. The invariant that mattered is intact — the dev fallback still **encrypts**, so no branch anywhere stores plaintext.
- **`scryptSync` over a constant salt**, derived once and cached against the secret. A constant salt is normally a defect; here the input is a 32+ char server secret rather than a password, so the salt does domain separation, not anti-precomputation — and every record already carries its own IV. Cached because scrypt costs ~100 ms and would otherwise land on every AI message.
- **Base64 for all three stored parts, asserted in the test.** Node's `Buffer.toString()` defaults to hex; mixing the two produces a value that round-trips locally and fails in production. This was already flagged in the spec's data-mapping table.

**Discovered**
- `lib/jwtSecrets.ts` is the repo's secret-handling precedent and it is a good one — it exists because three files once derived `JWT_SECRET` with three different fallbacks. Matching its shape was cheaper and safer than inventing a second convention. *(The Stage 2 claim "no encryption precedent exists" was true and still is — but it undersold what was there: no `createCipheriv`, yet a strong precedent for how to **handle a secret**.)*
- `@google/genai` is already a server dependency, though `api/ai.ts` deliberately uses raw `fetch`. Relevant to F004's list-models probe: match `ai.ts` and use `fetch`, rather than pulling in a second calling convention for one call.

**Left undone**
- Nothing partial. `lib/crypto.ts` is complete and self-contained; no caller imports it yet, which is expected — F004 and F007 are its first consumers.
- **Not yet committed.** Files on disk: `app/server/src/lib/crypto.ts`, `app/server/src/lib/crypto.test.ts`, modified `.env.example`, plus the harness. Stage these paths explicitly.

**Status:** 2 / 20 passing (10%)

**Next session should**
1. Commit F001 + F002 (explicit paths, not `-A`).
2. **F003** — add `UserAiKey` to `database/prisma/schema.prisma` + the `User` back-relation, then `prisma generate` and `migrate dev`. **Stop `:3000` first** or generate throws EPERM.
3. **F004** — `PUT /api/ai/key` with the list-models probe before any write.

---

### 2026-08-15 — Stage 0 → 2

**Completed**
- Requirement extraction over the existing codebase — `POST /api/ai/chat` already exists, is hardened, and has **zero client consumers**. This reframed the build from "add AI" to "surface AI + add BYOK".
- Stage 1 gate: problem, 10 acceptance criteria, out-of-scope, edge-case table → `build-spec.md` §1–§5.
- Stage 2 gate: architecture, state ownership, logic flow, **data mapping table**, non-functional targets → `build-spec.md` §6–§10.
- Decomposition → `feature-list.json`: 15 specified features on the critical path, 5 stubbed with `"steps": []`.
- Scope doc with UI hierarchy and the phase roadmap → `.agents/docs/features/ai-assistant-byok.md`.

**Discovered**
- `/chat`, `useChat` and `services/chat.ts` are **team chat over sockets**, not AI, and have no message persistence. Naming collision is real. Everything new is `assistant/*`; the socket is not touched.
- `AppLayout` has no right-hand slot — `<main>` must become a flex row. One structural edit, and the reason F010 exists as its own feature.
- The design system has **no** Sheet/Drawer, Tooltip, or Markdown renderer. `AssistantPanel` is therefore layout chrome in `components/layout/`, deliberately *not* a design-system primitive, and must not enter the barrel.
- `ai.ts:153–157` already documents that a fetch error message can embed the request URL — which carries the API key as a query parameter. This is the specific leak F006 hunts.
- Gemini's role token is **`model`**, not `assistant`. `ai.ts:104` coerces server-side, but the client still needs the mapping in both directions. Logged in the data-mapping table because this is exactly the class of defect tests miss.

**Decisions** *(recorded so no future session re-litigates them)*
- **D1 — Key stored server-side, AES-256-GCM, write-only API.** Rejected localStorage + browser→provider. Grounds are repo-specific: Gemini takes the key as a **URL query parameter**, this repo ships a console-monitor ingest that captures client console output, and a browser-resident key deletes all four cost controls added after a live unauthenticated-spend incident. Accepted residual risk, stated openly: the server can decrypt. Mitigated by a separate `AI_KEY_SECRET`, no plaintext fallback, and no admin read path.
- **D2 — Extend `/api/ai/chat`; do not fork it.** BYOK is a resolution order in front of the existing handler. All caps keep running before the outbound call.
- **D3 — `provider` column now, provider abstraction later.** A strategy interface for one implementation is speculative structure; a column is free.
- **D4 — v1 is not streaming.** SSE means a new response path and re-verifying the caps against partial output. Largest deliberate gap vs. the reference design.
- **D5 — One in-memory thread, `sessionStorage`, no persistence.** Matches the existing chat precedent (no message model exists).
- **D6 — Luxe tokens, not the reference screenshot's pink palette.** *Assumption, not confirmation — see below.*

**Left undone**
- Nothing started and reverted. No branch, no code, no commits. The working tree still carries **unrelated pre-existing modifications** (Projects/Notes/Daily work + untracked `.agents/reports/`) — those are not part of this build and must not be swept into its commits. **Stage only the paths this build changes; never `git add -A`.**

**Status:** 0 / 20 passing (0%)

**Next session should**
1. `git checkout -b sprint-11/ai-assistant-byok`
2. Build **F001** — `app/server/src/lib/crypto.ts` + `crypto.test.ts`. Prove the tamper case fails by inverting the assertion once, then restore it. Commit.
3. **F002** — `.env.example` + the missing-secret behaviour. Commit.
4. **F003** — schema + migration. Stop `:3000` first.

---

## Open decisions

**None. Gate 3 is fully unblocked.**

| # | Question | Resolution |
|---|---|---|
| 1 | **D6:** reference screenshot's pink palette, or ApexOps Luxe tokens? | **CLOSED 2026-08-15 — user confirmed ApexOps Luxe.** Per-surface token map written to `build-spec.md` §9; three verification steps added to F014. |

---

## Addendum — 2026-08-15, D6 resolution

**Discovered while writing the token map (worth more than the decision itself):**

- **This repo has TWO token systems.** The Luxe `@theme` scale (`brand-*`, `light/dark-*`,
  `global-*`, `shadow-ds-*`), and a shadcn neutral oklch set (`--background`, `--border`,
  `--muted-foreground`) added additively at `index.css:88–130`. The shadcn block is commented
  *"back the shadcn primitives in `components/ui/*` only"* — and **`components/ui/` does not
  exist**, so that set currently backs nothing. Assistant components use **Luxe exclusively**;
  a `bg-background` under `components/assistant/` is a defect. Now a grep step in F014.
- **The governing analogy is Sidebar.** The panel is the right-hand mirror of the left rail, so
  it takes the same fill with `border-l` and — at ≥1280 — **no shadow and no blur**. It is a
  border-separated rail, not a floating surface, which rules out both `.ds-frost` and `.ds-menu`
  for the container. Every other geometry call follows from this.
- **The user bubble is neutral, not lime.** `.ds-glow`'s own comment reserves the accent for
  *one focal element per view*. Lime on every user turn spends that budget on the least
  important element and leaves the send button competing with the transcript. The DS rule and
  the reference screenshot agree here — both keep the bubble grey and the send affordance
  accented.
- The mobile drawer reuses `AppLayout`'s **existing** scrim values verbatim (`bg-black/40
  backdrop-blur-sm`, `DUR.fast`) rather than a second near-identical one — pattern recognition,
  not a new utility.

**Next session should** — unchanged: create the branch, then **F001** (`lib/crypto.ts`).
