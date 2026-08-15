# AI Assistant (BYOK) — Build Spec

The source of truth for this build. Read at every session start.
If the code and this document disagree, **stop and resolve it** — do not quietly follow the code.

**Branch:** `sprint-11/ai-assistant-byok` · **Ledger:** `feature-list.json` · **Log:** `progress.md`
**Scope doc (Stage 0/1 source):** [.agents/docs/features/ai-assistant-byok.md](../../docs/features/ai-assistant-byok.md)

> **Harness location note.** The workflow prescribes the repo root. These live under
> `.agents/harness/<sprint>/` instead, because a root-level `build-spec.md` in a repo this
> size would read as describing the whole application rather than one sprint. A memory
> pointer records the path so a cold session finds it. Everything else is unchanged.
>
> ⚠️ **Not `.agents/build/`** — `.gitignore:33` carries a bare `build/`, which matches a
> directory of that name at *any* depth. The harness sat there untracked and invisible to
> `git status` until 2026-08-15; a fresh clone would have had no ledger at all. Never put
> state that must survive under a path named `build`.

---

## 1. Problem *(Stage 1)*

ApexOps ships a hardened `POST /api/ai/chat` that **no client has ever called** — the AI
capability exists on the server and is invisible in the product. Meanwhile the route
spends a single org-wide `GEMINI_API_KEY`, so any real usage bills one account for
everyone. Users have no way to reach the assistant and no way to pay for their own use.

## 2. Acceptance criteria *(Stage 1)*

Numbered, testable, and stable. Growth in the feature list is fine; changing these is drift.

1. A signed-in user can open a right-hand assistant panel from any authenticated route, send a message, and receive a rendered reply — without navigating away or losing page state.
2. A user can save their own Gemini API key, see it masked afterwards, and delete it in one click; the plaintext key is **never** present in any response body, log line, error message, or client-side storage.
3. With a stored key, requests spend that key. With no stored key but `GEMINI_API_KEY` set, requests spend the env key. With neither, the API answers `503 NO_KEY` and the panel shows an "Add your API key" affordance rather than an error.
4. An invalid key is rejected at save time with `400 INVALID_KEY`, and **zero rows are written**.
5. All four pre-existing cost controls still execute **before** any outbound provider call: `authenticate`, `aiChatLimiter`, prompt/history caps, `maxOutputTokens`. Verified by an oversize prompt producing a 400 with no outbound request.
6. The panel collapses and expands; the choice survives reload and route change.
7. Every new component draws colour, radius, type and motion from existing `@theme` tokens and `@/lib/motion`. Zero hex literals under `components/assistant/`.
8. Assistant output renders Markdown as React nodes. `dangerouslySetInnerHTML` appears nowhere in the new code.
9. `Esc` closes the panel and returns focus to its trigger; the message list announces via `role="log" aria-live="polite"`; the thinking indicator honours `prefers-reduced-motion`.
10. `npm run build` and `npm test` are green at both workspaces.

## 3. Out of scope *(Stage 1)*

- Streaming / SSE responses (D4 — v1 is request/response; largest deliberate gap vs. the reference design)
- Multi-thread conversation history and any server-side message persistence (D5)
- The reference's "Step 1 of 4" guided-progress rail
- File attachment in the composer — omitted rather than shown disabled (S-D1 bans dead switches)
- Providers other than Gemini (D3 reserves the column, not the abstraction)
- Project-shared or team-shared keys
- Any admin path that reads another user's key — **forbidden**, not deferred (REQ-S5)
- Page-context injection ("ask about this issue")

## 4. Inputs, outputs, dependencies *(Stage 1)*

- **Inputs:** `{ prompt: string ≤8000, history: {role:'user'|'model', text:string}[] ≤20 items / ≤24 000 chars }`; `{ provider: 'gemini', apiKey: string }` on key save.
- **Outputs:** `{ text, model, finishReason }` on chat; `{ provider, maskedKey, verifiedAt } | null` on key read. **Never** a plaintext key.
- **Depends on:** `middleware/auth.authenticate`, `middleware/rateLimit.aiChatLimiter`, `lib/authSession` (401 refresh), `lib/docsMarkdown`, DS `Modal`/`ConfirmDialog`/`Input`/`Textarea`/`AccentButton`/`EmptyState`, `lib/motion`, Prisma, Google Generative Language API.

## 5. Edge cases and error states *(Stage 1)*

| Condition | Behaviour |
|---|---|
| Empty / whitespace prompt | Send button disabled client-side; server 400 as backstop |
| Prompt >8 000 chars | Counter warns from 7 000; server 400 **before** any outbound call |
| History >20 messages | Client trims to the newest 20; server 400 is a backstop, not the normal path |
| No key anywhere | `503 NO_KEY` → `KeyMissingNotice`, not a red error |
| Stored key revoked at the provider | Provider 401/403 → `503 PROVIDER_ERROR`; provider text logged, never echoed |
| `AI_KEY_SECRET` unset | Key endpoints 503. **Never** store plaintext as a fallback |
| Ciphertext fails to decrypt (tampered / rotated secret) | Treat as no key, fall through to env, log user id only |
| Rate limit hit | `429 RATE_LIMITED` + retry-after rendered inline |
| Provider returns empty candidate | `502 EMPTY_RESPONSE` with `finishReason` surfaced |
| Two concurrent sends | Composer disabled while in flight; one request at a time |
| Access token expired mid-send | `fetchWithAuth` refreshes once and replays once (inherited) |
| Panel open on a wide table page | Content column keeps `min-w-0`; no horizontal page scroll |

---

## 6. Architecture *(Stage 2)*

- **Stack:** React 19 + TS + Vite + Tailwind v4 (`@theme` tokens) + motion/react · Express + Prisma + Postgres · Node crypto for AES-256-GCM.
- **Components and boundaries:**
  - `components/assistant/*` — presentation only, no fetching.
  - `hooks/useAssistant.ts` — owns thread state and error mapping.
  - `services/assistant.ts` — the **only** module that talks to `/api/ai/*`, over `fetchWithAuth`.
  - `api/ai-key.ts` — CRUD for the key; the only writer of `UserAiKey`.
  - `lib/crypto.ts` — the **only** module that sees plaintext key material. Security-critical; review before anything builds on it.
  - `api/ai.ts` — gains `resolveKey()` and nothing else.
- **State ownership:**
  | State | Owner | Lifetime |
  |---|---|---|
  | Thread messages | `useAssistant` + `sessionStorage` | Tab session (D5) |
  | Panel open/collapsed | `AppLayout` + `localStorage` | Device preference |
  | API key ciphertext | Postgres `user_ai_keys` | Until deleted |
  | Masked key + `verifiedAt` | Postgres, read-only to client | Until deleted |
  | Envelope secret | `AI_KEY_SECRET` env | Process |
- **Failure and fallback:** key resolution degrades BYOK → env → `NO_KEY`. Decrypt failure degrades to "no key" rather than erroring. Provider failure never leaks provider text to the client.

## 7. Logic flow *(Stage 2)*

**Save a key**
1. `PUT /api/ai/key` → `authenticate`.
2. Reject if `AI_KEY_SECRET` missing/≠32 bytes → 503. *(Never a plaintext fallback.)*
3. Reject if `provider !== 'gemini'` → 400.
4. Reject on shape/prefix failure → 400 `INVALID_KEY`. *(Cheap check before spending a network call.)*
5. Probe provider **list-models** — proves the key without generating tokens (REQ-S6).
6. Probe fails → 400 `INVALID_KEY`, **no write**.
7. Encrypt with a fresh 12-byte IV → upsert `{ciphertext, iv, authTag, maskedKey, verifiedAt}`.
8. Return `{provider, maskedKey, verifiedAt}`. Plaintext is now unreachable from outside.

**Send a message**
1. Client trims history to 20, disables the composer, appends an optimistic user row.
2. `POST /api/ai/chat` → `authenticate` → `aiChatLimiter` → `validateChatBody`. **All caps run here, before step 3.**
3. `resolveKey(userId)`: row exists → decrypt (failure ⇒ fall through) → else `GEMINI_API_KEY` → else `503 NO_KEY`.
4. Build `contents`, POST to Gemini with `safetySettings` intact.
5. Non-OK → map to a typed code; log provider text, echo none of it.
6. Empty candidate → `502 EMPTY_RESPONSE` + `finishReason`.
7. Success → `{text, model, finishReason}`; client appends the assistant row and re-enables the composer.

**Delete a key**
1. `ConfirmDialog` (DS rule for destructive actions) → `DELETE /api/ai/key` → row deleted by `userId`.
2. Next send falls through to env or `NO_KEY`. No orphaned ciphertext.

## 8. Data mapping *(Stage 2 — the move most often skipped)*

Field-by-field at every boundary. Shape mismatches are the defect class tests do not catch.

| Boundary | Client field | Wire field | Server/DB field | Trap |
|---|---|---|---|---|
| Composer → API | `message.text` | `prompt` | `parsed.prompt` | Client calls it `text` everywhere else — **rename at the service, not in the component** |
| Thread → API | `role: 'user' \| 'assistant'` | `role: 'user' \| 'model'` | Gemini `role` | Gemini says **`model`**, not `assistant`. `ai.ts:104` already coerces; the client must still send the pair it expects |
| API → Thread | `text` | `text` | Gemini `candidates[0].content.parts[0].text` | Deeply optional the whole way down — every level can be absent |
| Key save | `apiKey` | `apiKey` | never persisted as-is | Plaintext dies inside `lib/crypto`; nothing downstream sees it |
| Key read | `maskedKey` | `maskedKey` | `masked_key` | snake_case in Postgres, camel in Prisma — `@map` required |
| Key read | `verifiedAt` | ISO string | `verified_at` `DateTime?` | JSON gives a **string**, not a `Date`; parse at the client edge |
| Ledger of caps | — | — | `iv`, `authTag` as base64 `String` | Store base64, not `Buffer.toString()` default hex — pick one and assert it in the round-trip test |
| Errors | `AssistantErrorCode` | `{ error, code }` | — | The existing route returns `{error}` **with no `code`** — adding `code` is part of F008, and old shapes must stay tolerated |

## 9. UI and theme *(Stage 2)* — **D6 CONFIRMED: ApexOps Luxe, 2026-08-15**

Hierarchy, per-component build-vs-reuse, and file list: §3 of the [scope doc](../../docs/features/ai-assistant-byok.md).
States each surface must render: **empty**, **no-key**, **thinking**, **error** (5 codes), **rate-limited**, **populated**, **collapsed**, **mobile drawer**.

### 9.0 Which token system — the trap

This repo has **two**, and picking the wrong one silently forks the look:

| System | Where it's defined | Backs | Use here? |
|---|---|---|---|
| **Luxe `@theme`** — `brand-*`, `light/dark-*`, `global-*`, `shadow-ds-*`, `ease-lux` | `index.css` `@theme` (lines 12–83) | The whole app | ✅ **Yes, exclusively** |
| **shadcn neutral** — `--background`, `--foreground`, `--border`, `--muted`, oklch | `index.css` `:root` / `.dark` (lines 88–130) | `components/ui/*` only — **which does not exist in this repo** | ❌ **No** |

The shadcn block is explicitly commented *"back the shadcn primitives in `components/ui/*` only"*, and that directory is empty. Every assistant component uses the Luxe scale. **A `bg-background` or `text-muted-foreground` under `components/assistant/` is a defect, not a style choice** — add it to the F014 grep alongside hex literals.

### 9.1 The governing analogy

**The assistant panel is the right-hand mirror of the left nav rail.** `Sidebar` is
`w-64 border-r border-black/5 bg-light-surface dark:border-white/10 dark:bg-dark-surface`
— so the panel is the same surface with `border-l`, and the shell reads as symmetric
rather than as a bolted-on widget. This is the single decision the rest of the table falls out of.

Consequence: the desktop panel is **not** a floating surface. It gets **no shadow and no blur** —
it is a border-separated rail. `.ds-frost` and `.ds-menu` are both wrong for it, for the reasons
each carries in its own comment.

### 9.2 Token map, per surface

| Surface | Light | Dark | Notes |
|---|---|---|---|
| **Panel container (desktop)** | `bg-light-surface` `border-l border-black/5` | `dark:bg-dark-surface` `dark:border-white/10` | Mirrors `Sidebar` exactly. No shadow, no `backdrop-filter`. |
| **Panel container (drawer <1280)** | same fill + `.ds-elev-3` | same + `.ds-elev-3` | Now floating over content, so elevation is earned. |
| **Drawer scrim** | `bg-black/40 backdrop-blur-sm` | same | Byte-identical to `AppLayout`'s existing nav scrim. Do not invent a second one. |
| **Header** | `border-b border-black/5` | `dark:border-white/10` | `h-16` to line up with `Topbar` and the `Sidebar` brand block. |
| **Header title** | `font-heading text-brand-dark` | `dark:text-white` | DM Sans. Same treatment as the `Sidebar` wordmark. |
| **Header subtitle** (provider · model) | `text-light-text-secondary` | `dark:text-dark-text-secondary` | `text-xs`. |
| **User bubble** | `bg-light-surface-2 text-light-text` | `dark:bg-dark-surface-2 dark:text-dark-text` | **Neutral, not lime** — see §9.3. `rounded-2xl`, right-aligned, `max-w-[85%]`. |
| **Assistant message** | `text-light-text`, **no surface** | `dark:text-dark-text` | Bare text, left-aligned, full width. The asymmetry is the reference's core gesture and it is free. |
| **Timestamp / meta** | `text-light-text-secondary text-[11px]` | `dark:text-dark-text-secondary` | |
| **Code block in Markdown** | `font-mono bg-light-surface-2` | `dark:bg-dark-surface-2` | JetBrains Mono, already tokenised. |
| **Message action icons** | `text-light-text-secondary` → hover `text-brand-dark` | `dark:text-dark-text-secondary` → `dark:hover:text-white` | Same hover idiom as `Sidebar` nav rows. |
| **Thinking indicator** | `text-light-text-secondary` | `dark:text-dark-text-secondary` | Text-led, like the reference's *"Thinking about the concept…"*. |
| **Composer well** | `bg-light-surface-2` `border-t border-black/5` | `dark:bg-dark-surface-2` `dark:border-white/10` | |
| **Send button** | `AccentButton` (`bg-brand-accent text-brand-dark`) | same — lime is theme-invariant | **The one lime focal element in the panel.** |
| **Char counter, approaching cap** | `text-global-yellow` | same | From 7 000 of 8 000. |
| **Error row** | `text-global-red` + `bg-global-red/8` | same | `PROVIDER_ERROR`, `INVALID_KEY`, `EMPTY_RESPONSE`. |
| **Rate-limited row** | `text-global-yellow` + `bg-global-yellow/10` | same | Not red — it is a wait, not a fault. |
| **Key-verified badge** | `Badge` tone mapped to `global-green` | same | |
| **No-key notice** | `bg-brand-accentSoft` + `AccentButton` CTA | same | `accentSoft` is lime at 14% — an invitation, not an alarm. |
| **Focus ring** | `.ds-glow` on the composer when focused | same | `shadow-ds-glow` = lime ring + halo. Already the system's focus language. |

### 9.3 Why the user bubble is neutral and not lime

`.ds-glow`'s own comment reserves lime for the **active/CTA focal element, one per view**. A
lime bubble on every user turn spends that budget on the least important element in the panel
and leaves the Send button competing with the transcript. Neutral `surface-2` bubbles also match
the reference screenshot, where the user's turn is a soft grey — the accent there is spent on the
send affordance too. So the DS rule and the reference agree, which is why this is a decision and
not a preference.

### 9.4 Motion

Every value from `@/lib/motion` — no literals, per REQ-U2.

| Event | Vocabulary |
|---|---|
| Drawer in/out (<1280) | `x: 380 → 0`, `duration: DUR.base`, `ease: EASE_LUX` — the mirror of `AppLayout`'s `x: -280` nav drawer |
| Scrim in/out | `opacity`, `duration: DUR.fast` — identical to the nav scrim |
| Desktop panel open/close | width/opacity, `DUR.base` + `EASE_LUX` |
| Message append | `fadeUp` variant |
| Toggle + send press | `pressable` |
| Thinking dots | lime `brand-accent`, opacity pulse only — **suppressed entirely** under `prefers-reduced-motion` (F013) |

### 9.5 Geometry

`Surface`'s radius scale is `xl / 2xl / 3xl`. The panel container takes **no** radius (it is a
full-height edge rail). Bubbles take `rounded-2xl` — one step below the `Surface` default of
`3xl`, because a chat bubble is smaller than a card and `3xl` on a two-line bubble reads as a pill.
Panel width `380px` at ≥1280 (`w-64` = 256 on the left rail; the right panel holds prose and needs more).

### 9.6 The composition rule

`Surface.tsx` states it: *"Compose everything on top of these — never raw div + bg utilities."*
Where a boxed surface is needed (no-key notice, error row, key dialog body), use `Surface`.
The panel container and the message rows are the deliberate exceptions — a full-height rail and a
bare text run are neither cards nor menus, and forcing them through `Surface` would mean fighting
its padding and radius defaults. Exception noted here so a reviewer sees intent, not an oversight.

## 10. Non-functional *(Stage 2)*

- **Performance:** panel open→interactive <150 ms (no network on open); Markdown render of a 2 000-char reply <50 ms; the panel must not re-render the routed page on message append.
- **Security:** authn on every endpoint; per-user authz with **no admin read path**; AES-256-GCM at rest with `AI_KEY_SECRET` separate from `JWT_SECRET`; key never in a response, log, or error. Accepted residual risk: server-side decryption capability (D1).
- **Accessibility:** WCAG 2.1 AA. Keyboard-complete, `role="log"`, focus return on close, reduced-motion honoured.
- **Testing:** "tested" = the feature's ledger steps observed end to end through the interface a consumer touches. Unit tests on `lib/crypto` are necessary and **not** sufficient for any feature above F002.

---

## 11. Deployment *(Stage 6, drafted now)*

- **Environments:** local Docker compose; no auto-deploy exists — CI is checks-only by explicit design (`.github/workflows/ci.yml`), so merging ships nothing on its own.
- **Migration:** additive only. `user_ai_keys` is a new table; no existing column changes. Safe to apply ahead of the app.
  > ⚠️ **Use `prisma db push`, never `prisma migrate dev`.** This repo has no
  > `migrations/` directory and never has — `migrate dev` would read the populated
  > database as drifted and offer to reset it. Preview first with
  > `prisma migrate diff --from-schema-datasource … --to-schema-datamodel … --script`
  > and confirm the SQL contains no `DROP` or `ALTER` of an existing table.
  > Corrected 2026-08-15 at F003; the earlier text here said `migrate dev` and was wrong.
- **Rollback:** revert the app commit — the assistant panel and key routes vanish, `ai.ts` returns to env-only, and the orphan table is inert. Drop the table only after confirming no rollback-forward is planned. **Rotating `AI_KEY_SECRET` invalidates every stored key**; users re-enter them. Say so in release notes.
- **Smoke test:** sign in → open panel → send "hello" → reply renders → save a key → masked → delete → confirm fallback.
- **Watcher:** the implementing developer, through the first business day.

---

## Changelog

| Date | Change | Why |
|---|---|---|
| 2026-08-15 | Spec created from the scope doc | Stage 1+2 gate |
| 2026-08-15 | Harness placed under `.agents/build/` not repo root | Sprint-scoped build inside a large existing repo |
| 2026-08-15 | Moved `.agents/build/` → `.agents/harness/` | `.gitignore:33`'s bare `build/` matched it at any depth; the whole harness was untracked |
| 2026-08-15 | §11 corrected: `db push`, never `migrate dev` | This repo has no migrations directory; `migrate dev` would have offered to reset the database |
