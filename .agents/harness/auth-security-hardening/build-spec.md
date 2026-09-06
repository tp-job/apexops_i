# Build spec — auth security hardening, phases 2–4

**Branch:** `auth/security-hardening` (all three phases, by explicit instruction — the plan called
for one branch per phase so a revert has a boundary; bundling them means a revert of any one phase
takes the others with it). Phase 1 (revocation) and phase 5 (data cleanup) are already merged to
`main` — see `.agents/docs/planning/auth-review-and-restructure-2026-08-25.md`.

**Phase 4 is decision-gated, not scheduled** — token transport and password-policy direction both
need a decision from the user before code. This spec covers phase 2 in full; phase 3 is stubbed.

---

## Phase 2 — A3 (enumeration) + A5 (leaked error detail)

### Problem statement

Two unrelated defects that happen to share one file (`api/auth.ts`) and one root cause: an endpoint
telling the caller more than it should.

**A3 — three responses are an oracle.** `POST /register`'s `400 "Email already registered"` lets an
attacker check any address against the user table at the register rate limit (5/15min/IP).
`POST /login`'s `403 "Account is deactivated"`, answered **before** the password check, tells an
attacker an account exists and is deactivated without knowing its password. The login path's own
common case — `401 "Invalid email or password"` for both "no such user" and "wrong password" — is
already correct; these two are the outliers.

**A5 — 8 endpoints answer `err.message` on a 500.** Re-counted against the current file, not the
number in the original review (which said 5 and undercounted): `/refresh`, `GET /profile`,
`PUT /profile`, `PUT /settings`, `PUT /password`, `GET /sessions`, `DELETE /sessions/:id`,
`POST /sessions/revoke-all`. `/login`, `/register` and `/logout` already answer a fixed string — this
is carrying that same fix to the rest of the file.

### Acceptance criteria

1. **Amended after inspection, before coding — the original criterion was not achievable as written.**
   `registerSchema`'s own `.refine` already requires a name, so the handler's `if (!first)` branch is
   dead code the validator pre-empts: the duplicate-email check is the ONLY real post-validation
   rejection in `/register`, and `/register` mints and returns an access token synchronously on
   success. Full response parity between "new email" and "taken email" is only achievable by
   deferring account creation behind email verification — a product redesign, out of a hardening
   patch's scope and requiring a client change this phase explicitly excludes.
   **Revised criterion:** the response no longer confirms existence with the specific word
   `"registered"` or any wording that names the reason as *this account already exists*; it reads as
   a generic rejection. **Residual risk, stated rather than hidden:** the status code (`400`, not
   `201`) still distinguishes new-email from taken-email by itself, so this reduces the oracle's
   signal-to-noise (an automated scanner keyed on the literal string finds nothing) and leaves the
   per-IP rate limit as the remaining defence — it does not eliminate the oracle. Full closure is out
   of scope for this phase and would need a UAT-level product decision, not a code change alone.
2. `POST /login` against a deactivated account, correct password, returns the **same `401`** as a
   wrong password on an active account. (A **still-authenticated** caller can still learn their own
   account is deactivated — this is only about the pre-authentication response.)
3. `POST /login` against a deactivated account, **wrong** password, also returns that same `401` —
   not a different message that would let the two cases be told apart by trying a wrong password
   first.
4. None of the 8 endpoints above return `err.message`, a stack, or any Prisma-shaped string on a
   `500`. Each returns a fixed, endpoint-appropriate sentence; the real error still goes to
   `console.error` for the operator.
5. **Not touched, and stated why:** `POST /refresh`'s existing deactivation check (it deletes the
   user's tokens and answers 403) is not an enumeration oracle — the caller already holds a valid,
   signed refresh token for that specific account, so "is this account deactivated" is not new
   information being leaked to an outsider. Left as is.
6. `npm test`, `tsc --noEmit`, `npm run build` clean in the server workspace. No client change.

### Failure case, proven not declared

Reintroduce the old `403 "Account is deactivated"` pre-password-check branch in `/login` and show a
test goes red naming the leak, then revert clean.

---

## Phase 3 — A4 (refresh reuse detection) + A6 (per-account throttle)

### Two findings that change the design the original review sketched

1. **`Notification` is not a general per-user channel — it requires a `projectId`.** The review
   guessed the existing model + webhook dispatcher used for regressions was "the natural fit" for a
   security alert. It is not: every row is denormalized onto a project, and a compromised session is
   not about any project. Making `projectId` nullable to force-fit this would change the meaning of
   every existing query and index against a table this build did not open to touch. **Decision:**
   email only, to the account's own address, via the existing `lib/mail.ts` — the one channel here
   that is already project-agnostic. No in-app row this phase; recorded as a real gap, not hidden.
2. **A per-account lockout is itself a denial-of-service tool against a known victim** — OWASP's own
   guidance for A4/A6 says so directly: *"limit or increasingly delay... but be careful not to create
   a denial of service scenario."* A hard per-account lock that blocks the CORRECT password once
   tripped lets an attacker who merely knows someone's email address lock them out by spamming wrong
   passwords from many IPs, defeating the per-IP limiter that already exists. **Decision:** the
   per-account counter is sized as a distributed-credential-stuffing backstop, not a primary control —
   a high threshold over a long window (30 failed attempts / 60 minutes, both env-overridable, matching
   this file's existing `parseInt(process.env..., 10)` convention) — and its trip answers the
   **identical body and status** the existing per-IP limiter already returns, so it is not a new
   oracle that reveals which counter fired.

### A4 — reuse detection

**Problem.** Rotation hard-deletes the presented row and creates an unrelated new one
(`lib/sessions.ts` `issueSession`). Nothing links them, so a refresh token used a **second** time —
the signal that it was stolen and the legitimate device already rotated past it — is indistinguishable
from a token that never existed: both answer the same generic 401, and nothing is revoked beyond the
one row already gone.

**Design.** Add `family` (a UUID stamped once at login and carried forward through every rotation,
exactly like `absoluteExpiresAt` already is) and `rotatedAt` (null = this row is the current one;
non-null = it was consumed by a rotation, kept as a tombstone rather than deleted) to `RefreshToken`.
`/refresh` now:

| Lookup result | Meaning | Action |
|---|---|---|
| No row for this token, ever | Garbage, forged, or already fully revoked | Existing generic 401 |
| Row found, `rotatedAt` set | **Reuse** — this exact token was already rotated away once | Revoke the **whole family** (every row sharing it, including the one currently in legitimate use), email the account holder, log a structured warning. Answer the **same** generic 401 — do not tell the caller their replay was detected |
| Row found, `rotatedAt` null, past its window | Ordinary expiry | Existing behaviour, unchanged |
| Row found, `rotatedAt` null, live | Legitimate rotation | Tombstone the old row (`rotatedAt = now()`), issue the new one carrying the same `family` forward |

**Explicitly not built:** pruning tombstoned rows. They are deleted the moment their family is
revoked (logout, revoke-all, deactivation, demotion, or a detected reuse) — the only rows that could
accumulate are ones whose session simply idles out without ever hitting a revoke path. Left as a
known, bounded gap (one row per rotation, only for sessions nobody explicitly ends) rather than adding
a prune job this phase does not need to justify.

### A6 — per-account throttle

An in-memory `Map<string, Bucket>` keyed by the **lowercased submitted email**, mirroring
`api/ingest.ts`'s existing per-key/per-IP bucket pattern exactly (same shape, same sweeper) rather
than inventing a second idiom. Incremented on a failed login only; a **successful** login clears the
counter, so a legitimate user's own mistyped attempts never compound against them once they get it
right.

### Acceptance criteria

1. Rotating a refresh token normally: unchanged from the caller's point of view — new access + refresh
   token, same `family` carried forward (observable only via the database, not the API).
2. **The failure case this phase exists for.** Rotate token A to token B (A is now tombstoned). Present
   **A again**. Response: generic 401, identical in shape to an ordinary expired-token 401. Database
   check: **every** row in that family — including the still-legitimate token B — is gone. An email was
   sent to the account's address (verified against the mail driver's console/log output in dev).
3. Presenting a token that never existed still answers the same generic 401 — the reuse path and the
   never-existed path remain indistinguishable to the caller, exactly like the original design's
   revoked/expired/wrong-owner cases in phase 1.
4. Ordinary token expiry (idle window or absolute cap) is unaffected — same behaviour as before this
   phase.
5. 30 failed logins for one email within 60 minutes (from any mix of IPs) trips the throttle; the
   response is byte-identical in status and body to the existing per-IP limiter's response.
6. The 31st attempt with the **correct** password, one minute into the throttle window, is still
   refused — stated as a known, accepted trade-off (see finding 2 above), not silently discovered
   later.
7. A successful login for an account with prior failed attempts resets that account's counter to zero.
8. `npm test`, `tsc --noEmit`, `npm run build` clean in the server workspace.

### Failure case, proven not declared

Reintroduce the old two-independent-operations rotation (delete-then-create, no family, no tombstone)
and show a test names the fact that a reused token no longer revokes anything beyond itself, then
revert.

---

## Phase 4 — A7 (token transport) + A8 (password policy)

**Decision-gated.** Two open questions from the review, unresolved:

1. Move both tokens out of `localStorage` into an httpOnly cookie, or accept the XSS-blast-radius
   trade-off and document it as a standing constraint? Cookie transport touches CORS
   (`credentials: true`), every client fetch call, and the SDK's own auth story.
2. Keep the composition-based password policy (8+, upper/lower/digit) or move toward NIST 800-63B
   (length-weighted, breach-list check, drop composition rules)?

Not sized until answered.
