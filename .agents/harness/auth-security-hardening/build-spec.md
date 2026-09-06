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

## Phase 3 — A4 (refresh reuse detection) + A6 (per-account throttle + alerting)

**Stub — not built in this pass.** Needs a schema addition (a family/tombstone marker on
`RefreshToken`, since rotation currently hard-deletes the old row and so cannot tell "expired" from
"replayed") and a decision on where an alert goes (the existing `Notification` model + webhook
dispatcher used for regressions is the natural fit, per the original review). Sized in full once
phase 2 is merged.

---

## Phase 4 — A7 (token transport) + A8 (password policy)

**Decision-gated.** Two open questions from the review, unresolved:

1. Move both tokens out of `localStorage` into an httpOnly cookie, or accept the XSS-blast-radius
   trade-off and document it as a standing constraint? Cookie transport touches CORS
   (`credentials: true`), every client fetch call, and the SDK's own auth story.
2. Keep the composition-based password policy (8+, upper/lower/digit) or move toward NIST 800-63B
   (length-weighted, breach-list check, drop composition rules)?

Not sized until answered.
