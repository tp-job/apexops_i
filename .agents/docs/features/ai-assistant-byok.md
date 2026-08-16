# AI Assistant (BYOK) — right-sidebar copilot

**Status:** **built and verified 2026-08-16** — 20/20 features in the ledger; branch pushed, no PR opened ·
**Branch:** `sprint-11/ai-assistant-byok`
**Written:** 2026-08-15 · **Method:** Promethean Parthenon — Task pillar (extract → brief), Role pillar at D1/D2.
**Build record:** `.agents/harness/sprint-11-ai-assistant-byok/` (`build-spec.md`, `feature-list.json`, `progress.md`) —
per-feature verification notes, including what was observed and what was not.

---

## 0. What already exists (extracted, not invented)

Read before designing anything. Three of these change the shape of the feature.

| Fact | Where | Consequence for this feature |
|---|---|---|
| `POST /api/ai/chat` **already exists** and is hardened | [ai.ts](app/server/src/api/ai.ts) | This is an **extension**, not a new endpoint. Do not create `/api/assistant/*`. |
| It has **zero client consumers** | only `utils/mockData.ts` matches | The whole client half is greenfield. No callers to break. |
| Four cost controls run **before** the outbound call | ai.ts:18–30 | Any design that moves the provider call into the browser **deletes all four**. See D1. |
| Key is read from `process.env.GEMINI_API_KEY` per request | ai.ts:38 | BYOK becomes a *resolution order* in front of this, not a replacement. |
| `aiChatLimiter` keys on `req.user.id` | [rateLimit.ts:73](app/server/src/middleware/rateLimit.ts) | Per-user quota already correct for BYOK. Reuse as-is. |
| `/chat` + `useChat` + socket = **team chat, not AI** | [chat.ts](app/client/src/services/chat.ts) header comment | Naming collision. The AI surface is `assistant`, never `chat`. Do not touch the socket. |
| `AppLayout` has **no right slot** | [AppLayout.tsx:55](app/client/src/components/layout/AppLayout.tsx) | One structural edit needed. `<main>` must become a flex row. |
| DS has **no Drawer / Sheet / Tooltip / Markdown renderer** | [design-system/index.ts](app/client/src/components/design-system/index.ts) | Real cost line. See §3 build-vs-reuse table. |
| `dangerouslySetInnerHTML` is banned in the docs CMS | admin-docs precedent | Same rule applies to assistant output. Render Markdown to nodes. |
| Encryption at rest: **no precedent in the repo** | `grep createCipheriv` → 0 hits | `lib/crypto.ts` is new code, and it is the security-critical file of this sprint. |
| Branch convention is `sprint-N/kebab-slug` | `git log` (`sprint-10/daily-note-todo`) | Hence the branch name above — not `feature/…`. |

---

## 1. Design decisions (Role pillar)

### D1 — The key is stored server-side, encrypted, and never returned to the client

Rejected: localStorage + browser→Gemini direct.

The ask says "locally/encrypted". Both readings were priced. Client-only loses on repo-specific grounds, not general ones:

- The four controls documented in `ai.ts` (auth, per-user quota, prompt/history caps, `MAX_OUTPUT_TOKENS`) all run **before** the outbound call. A browser-resident key moves that call out of reach and silently reverts a Sprint-7 fix that was made after a live unauthenticated-spend incident.
- Gemini takes the key as a **URL query parameter**. This repo ships a console-monitor ingest that captures client console output. A key in a URL is one `console.error` away from being a stored log row.
- `safetySettings` and the error-shaping that refuses to echo *"API key not valid"* only exist on the server path.
- localStorage is readable by any XSS and any browser extension, and does not follow the user to a second device — the same argument that moved `theme` out of localStorage and onto `User.theme` (schema.prisma:28–32).

**Decision:** AES-256-GCM at rest, envelope key from a new `AI_KEY_SECRET` env var (32 bytes, **distinct from `JWT_SECRET`**). The API is write-only: the plaintext key goes in, and only `{ provider, maskedKey, verifiedAt }` ever comes back out.

**Accepted cost, stated plainly:** the server can decrypt user keys. If `AI_KEY_SECRET` and the database are both compromised, every stored key is compromised. Mitigations: separate secret, key never logged, never in an error message, never in a response body, deletable in one click, and `AI_KEY_SECRET` unset ⇒ endpoints answer 503 and **never fall back to storing plaintext**.

### D2 — Extend `/api/ai/chat`, don't fork it

Key resolution order, per request:

1. Caller's stored BYOK key (decrypted in-process, never held beyond the request)
2. `process.env.GEMINI_API_KEY` (org fallback — preserves today's behaviour)
3. Neither ⇒ `503 { code: 'NO_KEY' }` — the client turns this into "Add your API key", not an error toast

The four caps stay in front of all three branches. A BYOK key spends the *user's* money, which changes who pays but not whether an injected prompt can burn 8k tokens in a loop.

### D3 — Provider column now, provider abstraction later

Store `provider` on the row and constrain it to `'gemini'` in v1. One column costs nothing; a strategy interface for one implementation is speculative structure. Adding Anthropic or OpenAI later is then a migration-free change.

### D4 — v1 is not streaming

The existing route is request/response. Streaming means SSE, a new response path, and re-verifying the caps against a partial-output world. v1 ships a thinking indicator instead. **This is the largest UX gap against the reference screenshot and it is deliberate.** Booked as the first item of v2.

### D5 — One in-memory thread, no persistence

Matches the existing chat precedent (no message model exists). Thread lives in React state + `sessionStorage`, capped at `MAX_HISTORY_MESSAGES = 20` to mirror the server. "New chat" clears it. Multi-thread history and the reference's "Step 1 of 4" progress rail are **out of scope** — see §6.

### D6 — Assumption flagged: "strictly follow the visual hierarchy, component styling"

The reference screenshot is a soft-pink product that is not ApexOps. Taken as: **adopt its layout hierarchy and interaction grammar** (bare assistant text vs. tinted user bubble, per-message action row, status line above a reply, composer with attach + send), **rendered in ApexOps Luxe tokens** — `brand-accent` `#C5F43A`, `brand-dark` `#222222`, `light/dark-surface`, `font-heading` DM Sans, `EASE_LUX`, `DUR`, `SPRING` from `@/lib/motion`. Importing the pink palette would fork the design system, which the one-door barrel exists to prevent.

*This is the one item worth overruling before code starts.* If the pink palette was the actual instruction, say so and §3 changes.

---

## 2. Feature scope

### User stories

| # | As a… | I want… | So that… | Proof it works |
|---|---|---|---|---|
| US-1 | signed-in user | to open an AI panel on the right of any page | I can ask about what's on screen without losing it | Panel opens over/beside `<Outlet />`; page state survives open→close→open |
| US-2 | signed-in user | to collapse the panel and have it stay collapsed | it doesn't eat my width when I'm not using it | State persists across reload and route change |
| US-3 | signed-in user | to paste my own provider API key | I use my own quota, not the org's | Key saved; `GET /api/ai/key` returns `AIza…4f2c`, never the key |
| US-4 | signed-in user | the key validated before it's saved | I find out it's wrong now, not on my first message | Bad key ⇒ `400 INVALID_KEY`, nothing written to the DB |
| US-5 | signed-in user | to delete my key in one click | I can revoke it when I rotate | Row deleted; next send falls back to env key or `NO_KEY` |
| US-6 | signed-in user | to send a message and get a reply | the panel is useful | Reply renders as Markdown; ≤20-message history sent |
| US-7 | signed-in user | to copy or retry any assistant reply | I can reuse or recover from a bad answer | Copy writes to clipboard; retry re-sends the prior prompt |
| US-8 | signed-in user | clear feedback when I'm rate-limited or unconfigured | I know what to do next | 429 ⇒ inline notice + retry-after; 503 `NO_KEY` ⇒ "Add your API key" CTA |
| US-9 | keyboard user | to reach and leave the panel by keyboard | it's usable without a mouse | `Esc` closes and returns focus to the trigger; focus is trapped only in the key dialog |
| US-10 | admin | assurance no key is ever logged | a breach of logs isn't a breach of keys | Grep of logs/responses over a full send cycle yields zero key material |

### Technical requirements

**Security (all are pass/fail, none are advisory)**
- REQ-S1 `AI_KEY_SECRET` is 32 bytes, separate from `JWT_SECRET`. Unset ⇒ key endpoints 503. **Never** store plaintext as a fallback.
- REQ-S2 AES-256-GCM. Persist `ciphertext`, `iv` (12 B, fresh per write), `authTag`. Decrypt failure ⇒ treat as no key, log the user id only.
- REQ-S3 No endpoint, log line, error message, or response body ever contains plaintext key material. Enforced by a test that asserts it (US-10).
- REQ-S4 `GET` returns `maskedKey` only: first 4 + last 4, middle elided.
- REQ-S5 Key writes are `authenticate`-gated and scoped to `req.user.id`. No admin read path exists — an admin cannot read another user's key.
- REQ-S6 Provider validation call on save uses a **list-models** request, not a generation request — cheap, and it proves the key without spending tokens.

**Behaviour**
- REQ-B1 Resolution order per D2; env fallback preserved.
- REQ-B2 Existing caps unchanged: 8 000 prompt chars, 20 history messages, 24 000 history chars, 2 048 output tokens.
- REQ-B3 `aiChatLimiter` unchanged (per-user, per-hour).
- REQ-B4 Client trims history to 20 before sending, so the server's 400 is a backstop and not the normal path.
- REQ-B5 Errors are typed: `NO_KEY` | `INVALID_KEY` | `RATE_LIMITED` | `PROVIDER_ERROR` | `EMPTY_RESPONSE`. The panel renders a different affordance per code.

**UI**
- REQ-U1 Every colour, radius, font and shadow comes from `index.css` `@theme` tokens. Zero hex literals in new components.
- REQ-U2 All motion from `@/lib/motion` (`EASE_LUX`, `DUR`, `SPRING`). No hand-rolled tweens — the DS bans them explicitly.
- REQ-U3 ≥1280px: panel is an inline column, content reflows. <1280px: overlay drawer with scrim, mirroring the existing mobile nav drawer.
- REQ-U4 Markdown rendered to React nodes. `dangerouslySetInnerHTML` is forbidden.
- REQ-U5 Collapsed/expanded state persists in `localStorage` (a device preference, unlike the key).
- REQ-U6 Message list is `role="log"` `aria-live="polite"`; the thinking indicator respects `prefers-reduced-motion`.

### Data flow

```
Saving a key
  KeyDialog ──POST /api/ai/key {provider, apiKey}──► api/ai-key.ts
                                                      │ authenticate
                                                      │ shape + prefix check
                                                      │ provider list-models probe ──► Gemini
                                                      │   fail ⇒ 400 INVALID_KEY, no write
                                                      │ lib/crypto.encrypt(key, AI_KEY_SECRET)
                                                      ▼
                                              UserAiKey  (ciphertext, iv, authTag)
                                                      │
              ◄──200 {provider, maskedKey, verifiedAt}─┘        plaintext never returns

Sending a message
  Composer ─► useAssistant ─► services/assistant.ts
                                 │ trim history to 20 (REQ-B4)
                                 └─POST /api/ai/chat {prompt, history}─► ai.ts
                                       │ authenticate
                                       │ aiChatLimiter (per user id)
                                       │ validateChatBody — caps, BEFORE any spend
                                       │ resolveKey: BYOK ─► env ─► 503 NO_KEY
                                       │   decrypt in-process, never cached
                                       └─► Gemini generateContent (safetySettings intact)
                                             │
                                             ├─ ok    ─► {text, model, finishReason}
                                             └─ error ─► shaped code, provider message logged only
                                       ▼
                              MessageList renders Markdown → React nodes
```

---

## 3. UI component hierarchy

```
AppLayout                                        (EDIT — <main> becomes a flex row)
├── Sidebar                                      (unchanged)
├── column
│   ├── Topbar                                   (EDIT — add AssistantToggle)
│   │   └── AssistantToggle                       NEW  icon button, aria-expanded/-controls
│   └── main  ⟵ flex row
│       ├── <Outlet />                            (unchanged, min-w-0)
│       └── AssistantPanel                        NEW  <aside>, w-[380px] ≥1280 / drawer below
│           ├── AssistantHeader                   NEW
│           │   ├── title + provider/model subtitle
│           │   ├── NewChatButton                 NEW  clears thread (D5)
│           │   └── CollapseButton                NEW
│           ├── AssistantBody                     NEW  scroll container, role="log"
│           │   ├── AssistantEmptyState               REUSE  EmptyState
│           │   ├── KeyMissingNotice              NEW  shown on NO_KEY → opens KeyDialog
│           │   ├── MessageList                   NEW
│           │   │   └── MessageRow                NEW
│           │   │       ├── UserBubble            NEW  right, tinted, timestamp
│           │   │       ├── AssistantMessage      NEW  left, bare text — no bubble
│           │   │       │   └── MarkdownBlock     NEW  reuse lib/docsMarkdown.ts (REQ-U4)
│           │   │       └── MessageActions        NEW  copy · retry · … (hover/focus reveal)
│           │   └── ThinkingIndicator             NEW  status line above the pending reply
│           ├── AssistantError                    NEW  one row per REQ-B5 code
│           └── AssistantComposer                 NEW
│               ├── Textarea                          REUSE  DS Textarea, auto-grow
│               ├── CharCounter                   NEW  warns approaching 8 000
│               └── SendButton                        REUSE  AccentButton
└── KeyDialog                                     NEW  rendered at layout root
    ├── Modal                                         REUSE  DS Modal (Radix focus mgmt)
    ├── Field + Input type="password"                 REUSE
    ├── provider Select                               REUSE  (locked to Gemini in v1)
    ├── MaskedKeyRow                               NEW  "AIza…4f2c · verified 2026-08-15"
    └── ConfirmDialog                                 REUSE  required before delete (DS rule)
```

**Build vs. reuse:** 15 new components, 7 DS primitives reused as-is, 3 files edited. The DS covers overlays, forms and buttons; it does **not** cover a side sheet, a tooltip, or Markdown rendering. `AssistantPanel` is layout chrome, so per the folder convention it lives in `components/layout/` — it is **not** a new design-system primitive and must not be added to the barrel.

**Files**
```
NEW  app/client/src/components/assistant/*          (13 files above)
NEW  app/client/src/components/layout/AssistantPanel.tsx
NEW  app/client/src/hooks/useAssistant.ts
NEW  app/client/src/services/assistant.ts
NEW  app/client/src/types/assistant.ts
NEW  app/server/src/api/ai-key.ts
NEW  app/server/src/lib/crypto.ts                   ← security-critical, review first
NEW  app/server/src/lib/crypto.test.ts
EDIT app/client/src/components/layout/AppLayout.tsx
EDIT app/client/src/components/layout/Topbar.tsx
EDIT app/server/src/api/ai.ts                       (resolveKey only)
EDIT app/server/src/server.ts                       (mount /api/ai/key)
EDIT database/prisma/schema.prisma
```

**Schema addition**
```prisma
model UserAiKey {
  id         Int      @id @default(autoincrement())
  userId     Int      @unique @map("user_id")
  provider   String   @default("gemini")          /// D3 — column now, abstraction later
  ciphertext String                                /// AES-256-GCM. Never selected into a response.
  iv         String                                /// 12 bytes, fresh per write
  authTag    String   @map("auth_tag")
  maskedKey  String   @map("masked_key")           /// the ONLY form safe to return
  verifiedAt DateTime? @map("verified_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_ai_keys")
}
```
Add `aiKey UserAiKey?` to `model User`.
⚠️ Stop the `:3000` dev server before `prisma generate` — EPERM on Windows otherwise.

---

## 4. Implementation checklist

Each step ends in a verified commit. **"Implemented" is not "verified" — do not tick a box you did not observe.**

### Gate 0 — branch
- [x] `git checkout -b sprint-11/ai-assistant-byok`
- [x] Confirm D6 with the user (pink palette vs. Luxe tokens) — this is the one blocking question

### Phase 1 — crypto foundation *(do this first; everything else assumes it)*
- [x] `lib/crypto.ts`: `encrypt(plain)` → `{ciphertext, iv, authTag}`, `decrypt(...)` → string, `mask(key)`
- [x] Fail loudly if `AI_KEY_SECRET` is missing or ≠32 bytes. No plaintext fallback (REQ-S1)
- [x] `crypto.test.ts`: round-trip; tampered `authTag` throws; two encrypts of the same input differ (fresh IV)
- [x] Document `AI_KEY_SECRET` in `.env.example` with a generation command
- [x] ✅ **Verify:** `npm test -- crypto` green, tamper case genuinely fails

### Phase 2 — schema
- [x] Add `UserAiKey` + the `User` back-relation
- [x] Stop `:3000`, `prisma generate`, ~~`prisma migrate dev`~~ → **`prisma db push`** (see correction 1 below)
- [x] ✅ **Verify:** table exists; server typechecks

### Phase 3 — key API
- [x] `api/ai-key.ts`: `GET /api/ai/key`, `PUT /api/ai/key`, `DELETE /api/ai/key`, all `authenticate`
- [x] `PUT`: shape check → provider list-models probe (REQ-S6) → encrypt → upsert. Probe fails ⇒ 400, **zero writes**
- [x] `GET`: `select` only the safe columns. Never select `ciphertext` in this handler
- [x] Mount in `server.ts`
- [x] ✅ **Verify:** save a real key; save a junk key (400, table still empty); `GET` shows the mask; `DELETE` clears it; **grep the full request log for key material → zero hits (US-10)**

### Phase 4 — wire BYOK into the chat route
- [x] `resolveKey(userId)` in `ai.ts` implementing D2's three branches
- [x] Distinguish `503 NO_KEY` from the existing generic 503
- [x] Confirm every cap still runs **before** `resolveKey` — never reorder
- [x] ✅ **Verify:** with a BYOK key set → reply; key deleted + env key present → still replies; both absent → `503 NO_KEY`; oversize prompt → 400 with **no** outbound request

### Phase 5 — client data layer
- [x] `types/assistant.ts`, `services/assistant.ts` (via `fetchWithAuth`, so 401-refresh is inherited)
- [x] `useAssistant.ts`: thread state, 20-message trim, `sessionStorage`, typed errors per REQ-B5
- [x] ✅ **Verify:** send from a scratch harness before any UI exists; error codes surface distinctly

### Phase 6 — panel shell
- [x] `AssistantPanel` (aside ≥1280 / drawer + scrim below, reusing the mobile-nav motion)
- [x] `AppLayout` `<main>` → flex row; `Outlet` gets `min-w-0`
- [x] `AssistantToggle` in `Topbar`; `localStorage` persistence (REQ-U5)
- [x] ✅ **Verify:** toggle at 1440 and 768; reload keeps state; page state survives open→close→open; no horizontal scroll

### Phase 7 — conversation UI
- [x] Header, MessageList/MessageRow, UserBubble (tinted, right), AssistantMessage (bare, left)
- [x] `MarkdownBlock` over `lib/docsMarkdown.ts` — nodes, never `dangerouslySetInnerHTML`
- [x] `ThinkingIndicator`, `MessageActions` (copy · retry), `AssistantError`, `EmptyState`
- [x] `AssistantComposer` with auto-grow Textarea + CharCounter + AccentButton
- [x] ✅ **Verify:** full exchange renders; copy lands on the clipboard; retry re-sends; a fenced code block renders as a code block

### Phase 8 — key UI
- [x] `KeyDialog` on DS `Modal`; `Input type="password"`; masked row; `ConfirmDialog` before delete
- [x] `KeyMissingNotice` on `NO_KEY`, opening the dialog
- [x] ✅ **Verify:** save → mask shown, field cleared; delete → confirm required; devtools shows no plaintext in any response

### Phase 9 — polish & proof
- [x] Keyboard: `Esc` closes and restores focus; tab order sane; `role="log"` announces (REQ-U6)
- [x] `prefers-reduced-motion` respected
- [x] Dark mode across every new surface
- [x] Token audit: zero hex literals in `components/assistant/*` (REQ-U1)
- [x] `npm run build` in the client — **`tsc --noEmit` is not sufficient**, `erasableSyntaxOnly` errors only surface in the real build
- [x] ✅ **Verify:** ten user stories walked end to end, each observed

### Gate 10 — land
- [x] Update `.agents/docs/product/user-flow.md` — inventory row, nav paragraph, sequencing item 5 and the flow diagram all now describe the panel that shipped rather than the entry point this doc originally guessed at
- [ ] PR body: decisions D1–D6, the accepted risk in D1, and what v2 owes — **not done.** The branch is pushed, but `ci.yml` runs only on `pull_request` and `push: [main]`, so opening the PR is also what first puts this feature through CI.

---

## 4a. As-built corrections — where this document was wrong

Kept rather than quietly edited away. Each was found by a verification step failing, and each is the
kind of thing the next person would otherwise rediscover the expensive way.

**1. `prisma migrate dev` would have offered to reset the database.** Phase 2 said to run it. This
repo has **no `database/prisma/migrations/` directory** and has never used `prisma migrate` — the
prior sprint applied schema changes with `db push`. Prisma would have read the populated database as
drifted. Applied with `db push` after previewing the exact SQL via `prisma migrate diff --script`
and confirming it was purely additive: one `CREATE TABLE`, one unique index, one cascade FK, zero
`DROP`. **Every schema change in this repo goes through `db push` until somebody deliberately
introduces a migrations history.**

**2. The provider key travels in a header, not the query string.** Google documents `?key=…`, and
`api/ai.ts` already carried a comment warning that a fetch error's message can embed the request
URL — i.e. the key. Both `ai.ts` and `ai-key.ts` now send `x-goog-api-key` instead, which removes
that leak class rather than defending against it.

**3. A rejected Gemini key answers HTTP 400, not 401/403** — and is otherwise identical to a
malformed payload (both `INVALID_ARGUMENT`). Routing on status alone reported a user's bad key as
"Invalid request to AI service", which tells them nothing actionable. Detection is keyed on
`error.details[].reason === 'API_KEY_INVALID'`. A rejected **user** key returns `INVALID_KEY` ("fix
your key"); a rejected **org env** key returns `PROVIDER_ERROR`, because the user can do nothing
about it and must not be told to delete their own credential.

**4. CI runs ESLint; the sprint's own gates did not.** Typecheck, tests and build were run at every
step and all stayed green while `services/assistant.ts` accumulated five `no-explicit-any` errors
that would have failed CI. A local gate that is a subset of the real gate reports green for the
wrong reason.

### As-built name map

The §3 hierarchy above is the *plan*. Four names in it do not exist in the tree — kept as planned
names with the map below, because renaming shipped code to match a sketch is the wrong direction.
Grep the right-hand column.

| Planned name (§3) | What actually shipped |
|---|---|
| `MarkdownBlock` | `components/assistant/AssistantMarkdown.tsx` |
| `AssistantError` | `components/assistant/AssistantErrorRow.tsx` (also exports `KeyMissingNotice`) |
| `AssistantToggle` | **no component** — the trigger is ~10 lines inline in `components/layout/Topbar.tsx`, an `FiCpu` button carrying `aria-expanded` / `aria-controls="assistant-panel"`. A one-instance component would have added a file and a prop hop for nothing. |
| `ThinkingIndicator`, `MessageActions`, `MessageRow`, `EmptyState` | all inside `components/assistant/MessageList.tsx`; only `ThinkingIndicator` is exported, the rest are private to the list |

`AssistantPanel` lives in `components/layout/`, **not** `components/assistant/`, and deliberately
never entered the design-system barrel — it is layout chrome, not a primitive.

### Verification gaps carried forward

Recorded here because the harness gets archived and these do not. All three are limits of the
headless browser pane used during the build, not known defects:

| Gap | Why it could not be observed | Re-check by |
|---|---|---|
| F010 — panel swaps rail↔drawer on a **live resize** | The CDP viewport override fires neither `resize` nor a matchMedia `change` event (counted 0 of each while `matchMedia` itself flipped). The mount decision *is* verified at both widths via fresh loads; the listener path is not. | Dragging a real window across 1280px |
| F013 — `prefers-reduced-motion: reduce` | The pane offers no way to emulate the media query. `useReducedMotion` suppresses the thinking-dot animation entirely, but that branch has never executed. | OS-level reduced motion, then open the panel and send |
| F016 — clipboard **success** path | `navigator.clipboard.writeText` rejects with `NotAllowedError` — a synthetic click carries no user activation. The *failure* path is verified: blocked clipboard stays silent and leaves the icon unchanged. | A real click in a focused window; expect check → copy after ~1.6s |

---

## 5. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| `AI_KEY_SECRET` leaks alongside a DB dump ⇒ all keys compromised | **High** | Separate secret, separate rotation, documented as accepted (D1) |
| A key reaches a log via an error path | **High** | REQ-S3 + the Phase-3 grep is a real gate, not a note |
| Panel width breaks dense pages (DataTable, Gantt) | Medium | `min-w-0` on the Outlet; verify Bug Tracker and Projects specifically |
| Markdown renderer becomes an XSS surface | Medium | Nodes only; `dangerouslySetInnerHTML` forbidden (REQ-U4) |
| "Assistant" confused with team chat | Low | Naming rule: `assistant/*` everywhere, never `chat` |
| DS gaps (no Sheet/Tooltip) invite one-off styling | Low | `AssistantPanel` is layout, not DS; barrel stays closed |

---

## 6. Explicitly out of scope for v1

Streaming (D4) · multi-thread history and persistence (D5) · the reference's "Step 1 of 4" progress rail · file attachment (the composer's paperclip renders **disabled**, or is omitted — a dead control violates the S-D1 no-dead-switches rule) · non-Gemini providers (D3) · sharing a key across a project · admin visibility into user keys (REQ-S5 forbids it) · page-context injection ("ask about this issue").
