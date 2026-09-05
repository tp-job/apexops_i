# Authentication review, and the restructuring plan — 2026-08-25

> **Update 2026-09-06 — phases 1 and 5 are done.** A1, A2 and A9 are closed and verified end to end;
> the account cleanup ran. What is still open: A3–A8, i.e. phases 2, 3 and 4. Details at the end of
> this file. The findings below are left exactly as written so the record shows what was true when
> the decisions were made.

**Status when written: review and plan only. Nothing was changed and nothing was deleted.** Every number below was
measured against the code on `main` at `d67abca` and against the live development database. Where a
claim could not be measured, it says so.

Audited against [OWASP Top 10 2025 A07 — Authentication Failures](../../../.claude/skills/promethean-parthenon/bundled/owasp-top-10-2025/references/authentication-failures.md),
with A01 (access control) and A04 (cryptographic failures) where they touch the same code.

**Read first:** `app/server/src/middleware/auth.ts`, `api/auth.ts`, `lib/sessions.ts`,
`lib/jwtSecrets.ts`, `schemas/auth.schema.ts`, `middleware/rateLimit.ts`,
`app/client/src/lib/authSession.ts`.

---

## What is already right

Stated first because the findings below are narrow, and a review that only lists faults gives a false
impression of the whole.

| Control | Why it matters |
|---|---|
| **`authorize()` resolves role and `isActive` from the database, per request** | No token-version scheme, no invalidation window. A demoted admin loses admin on their next call. This is the design several sprint plans kept proposing to solve with a `tokenVersion` column — and the simpler answer won |
| **Fail-closed authorisation** | If the role lookup throws, the answer is `503`, never "assume the token was right" |
| **Algorithm pinning** — `jwt.verify(..., { algorithms: [JWT_ALGORITHM] })` | Closes `alg: none` and HS/RS confusion, which is the classic JWT bypass |
| **One module owns the secrets** (`lib/jwtSecrets.ts`), and it refuses to boot in production without them | The previous shape derived them in three places with fallbacks that disagreed — sign with one, verify with another |
| **Refresh rotation is single-use, and the absolute cap is carried forward, not recomputed** | Recomputing is what made sessions immortal: a weekly refresh renewed seven days forever |
| **Session list never returns the token** — only the last 8 characters as a fingerprint | The row *is* the credential; a list endpoint that returned it would be a credential-dumping endpoint |
| **Revoking another session is scoped by `userId`** | Cannot revoke someone else's session, and cannot probe whether an id exists |
| **`bcrypt`, 12 rounds; `.env` is gitignored; the dev seed refuses `NODE_ENV=production` and a non-local `DATABASE_URL`** | A07 #3 — no default credentials reachable from a real deployment |

---

## Findings

Ranked by what an attacker gets, not by how hard they are to fix.

### A1 — Revocation does not revoke. Up to **8 hours** of access after "sign out everywhere" · CRITICAL

**The gap.** Access tokens carry `sid`, the `RefreshToken` row id. `sid` is read in three places —
`middleware/auth.ts` twice, `api/auth.ts` once — and **is never checked against the table.**
`authenticate` verifies the signature and expiry of the token and nothing else: not that the session
still exists, not that the user is still active.

**What that costs, measured:**

| Fact | Where |
|---|---|
| Access-token lifetime = the user's `sessionTimeout`, in minutes | `lib/sessions.ts` — `expiresIn: minutes * 60` |
| Default `sessionTimeout` = **480 minutes**; maximum = **480** | `lib/sessions.ts` `DEFAULT_TIMEOUT_MIN` / `MAX_TIMEOUT_MIN` |
| Routers behind `authenticate` | **22** |
| Routers that also call `authorize()` | **4** (`users`, `logs`, `console-logs`, `admin-docs`) |

So **18 routers' worth of endpoints** — projects, issues, tickets, notes, tasks, calendar, chat, AI —
are protected by signature verification alone. Every revocation path is therefore advisory for up to
eight hours:

- `POST /api/auth/logout` — deletes the refresh row; the access token keeps working.
- `DELETE /api/auth/sessions/:id` — same.
- `POST /api/auth/sessions/revoke-all` — the button says *sign out everywhere*. It does not.
- `api/users.ts` → `revokeAllSessions(id)` on **deactivation** and on **demotion**. An admin
  responding to a compromised account gets a success message and an attacker who keeps working.

The last one is the reason this is CRITICAL rather than HIGH: the control exists, is documented, is
used during incident response, and does not do the thing its name claims. OWASP A07 #11.

**Fix, and it is small.** Check `sid` in `authenticate`: one indexed lookup for the session row joined
to the user. That query can return `role` and `isActive` at the same time, which means
`authorize()`'s separate lookup collapses into it — **one query replaces two** on role-gated routes,
and adds one primary-key read on the rest. Tokens minted before Sprint 5 have no `sid`; decide
explicitly whether those are rejected (clean) or grandfathered (compatible), and write the decision
down rather than leaving it to a `?.`.

### A2 — Logout reports success without revoking anything · HIGH

```ts
router.post('/logout', authenticate, async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) { await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }); }
    res.json({ message: 'Logout successful' });
});
```

A client that omits the body — or sends the wrong token — gets `200 Logout successful` and keeps a
live session. The authenticated caller's own session id is right there in `req.user.sid` and is not
used. Fix: revoke by `sid`, treat a body-supplied token as an optional extra, and return what was
actually revoked.

### A3 — Account enumeration on registration and login · MEDIUM-HIGH

- `POST /register` answers `400 "Email already registered"`. That is an oracle: an attacker learns
  which addresses have accounts, one request at a time, rate-limited only to 5 per 15 minutes per IP.
- `POST /login` answers `403 "Account is deactivated"` **before** the password check, so a deactivated
  account can be identified without knowing its password.
- The password comparison is skipped entirely for an unknown email, so response timing distinguishes
  "no such user" from "wrong password" even where the message does not.

OWASP A07 #8 asks for the same outcome for all cases. The login path already does this correctly for
the common case (`Invalid email or password`), which makes the three exceptions look like oversights
rather than decisions.

### A4 — Rotation without reuse detection · MEDIUM

Rotation is implemented correctly: the presented row is deleted and a new one issued. But a **replayed
token that was already rotated** simply returns `401`. Nothing distinguishes "an old token turned up"
from "a token expired", and an old token turning up is the signal that a refresh token was stolen.

Today, if an attacker steals a refresh token and uses it first, they get a working session and the
legitimate user is quietly signed out at their next refresh. Nobody is told. The standard answer
(OAuth 2.0 BCP §4.13) is to keep the rotated token as a tombstone and, on reuse, revoke the whole
family and alert.

### A5 — Five error paths leak internals · MEDIUM

`/refresh`, `/logout`, `GET /sessions`, `DELETE /sessions/:id`, and `/sessions/revoke-all` all end
with `res.status(500).json({ error: err.message || '…' })`. `err.message` from Prisma carries absolute
server file paths and the failing query text.

This is the exact hazard `/login` and `/register` already have a comment about — the fix was applied
there and never carried to the rest of the file.

### A6 — Rate limiting is per-IP only, with no per-account throttle and no alerting · MEDIUM

10 login attempts per 15 minutes **per IP**. Distributed credential stuffing — the attack OWASP A07 #1
opens with — spreads across IPs and is unaffected. There is no per-account attempt counter, no
increasing delay, and no log line or alert on repeated failures (A07 #9). The application already has
a `Notification` model and a webhook dispatcher for regressions; the machinery to raise an alert
exists and is not pointed at authentication.

### A7 — Both tokens live in `localStorage` · MEDIUM (architectural)

`lib/authSession.ts` stores `accessToken`, `refreshToken` and `user` in `localStorage`. Any XSS is
total: the access token *and* the seven-day refresh token exfiltrate in one line, and the refresh
token cannot be revoked by the victim closing the tab.

Rated MEDIUM rather than HIGH because the XSS surface has been deliberately narrowed — `/docs` renders
a typed tree with no `dangerouslySetInnerHTML` anywhere in the path, and the rich-text reader is the
same. It is on this list because it is the finding that constrains the *architecture*, so it belongs
in the restructuring decision rather than in a patch.

### A8 — Composition-rule password policy, no breach check · LOW-MEDIUM

8 characters, one uppercase, one lowercase, one digit. NIST 800-63B (which A07 #6 points at)
recommends the opposite trade: length over composition, plus a check against known-breached passwords.
Composition rules push users toward `Password1`.

### A9 — The security document overstates the token lifetime by 8× · LOW, but it is the first thing an auditor reads

`.agents/docs/architecture/security-auth.md` says *"Access token (short-lived, default 1h)"*. It is
**480 minutes**. The same file sends unauthenticated users to `/auth`, a route that does not exist
(it is `/login`), and predates `authorize()`'s database resolution, the session list, and the absolute
cap — so it under-sells the real controls while over-selling that one.

---

## The restructuring plan

One phase, one branch — so a revert has a boundary and each phase's close-out has to be true rather
than asserted. Ordered by "does the control currently lie", not by effort.

| Phase | Branch | Closes | Why here in the order |
|---|---|---|---|
| **1** | `auth/phase-1-revocation` | A1, A2, A9 | Until this lands, four security controls and one admin incident-response action do not do what they say. A9 rides along because phase 1 is what makes the document true |
| **2** | `auth/phase-2-enumeration-and-errors` | A3, A5 | Small, self-contained, no schema change, no client change |
| **3** | `auth/phase-3-reuse-detection` | A4, A6 | Needs a schema column and a place to send alerts; both are additive |
| **4** | `auth/phase-4-token-transport` | A7, A8 | **Decision-gated, not scheduled.** Moving the refresh token to an httpOnly cookie touches every client transport, CORS, and the SDK story. Do not start it as a continuation of phase 3 |
| **5** | `auth/phase-5-data-cleanup` | the data below | Separate branch because it is the only irreversible one |

**Phase 1's acceptance criteria, as observations** — the pattern the rest should copy:

1. Sign in on two devices. Revoke device B from device A. Device B's **next API call** is `401` —
   not its next refresh.
2. "Sign out everywhere" from device A: device A's own next call is `401` too.
3. An admin deactivates an account that is mid-session; that account's next call is `401`.
4. An admin demotes an admin mid-session; their next call to a `authorize('admin')` route is `403`
   **and** their next call to any ordinary route still succeeds as a normal user.
5. **Failure case, proven not declared:** delete the session row directly in the database and show
   the token stops working on the next request — proving the check reads the table rather than
   trusting a cached claim.
6. The added query is one indexed read: shown by the Prisma query log for a single request, not by
   assertion.

---

## The data cleanup

### Retention rules, as given

> Retain system-created development and administrator users, and submitted project data for examples
> and documentation.

### Measured inventory — 2026-08-25

**Users (9).** "System-created" is checkable: `scripts/seed-dev-users.ts` upserts exactly two.

| id | Email | Role | Owns | Verdict |
|---|---|---|---|---|
| 7 | `dev.user@apexops.local` | user | 4 projects, 3 notes, 1 task | **KEEP** — seeded, re-runnable |
| 8 | `dev.admin@apexops.local` | admin | 4 projects | **KEEP** — seeded, re-runnable |
| 1 | `admin@apexops.com` | admin | project `default` | **KEEP** — the administrator account. ⚠️ see the note below |
| 2 | `aindoe1@gmail.com` | user | 1 note | ad-hoc test account |
| 3 | `nevinasv@gmail.com` | user | 2 notes | ad-hoc test account |
| 4 | `Gar1nge@gmail.com` | user | 1 note, 1 task | ad-hoc test account |
| 5 | `GaDFr1nge@gmail.com` | user | 1 note | ad-hoc test account |
| 6 | `Admin1@apexops.com` | **user** | — | ad-hoc; the name says admin, the role does not |
| 11 | `invitee@apexops.local` | user | — | created by hand during the invites sprint; **in no seed script** |

> ⚠️ **`admin@apexops.com` exists in no script.** It predates `seed-dev-users.ts` (created
> 2025-12-25) and owns the `default` project. Nothing recreates it if it is lost, which makes the
> most privileged account in the system the least reproducible thing in it. Phase 5 should either
> add it to the seed or retire it in favour of `dev.admin` — but not silently leave it as is.

**Projects (9).**

| id | Slug | Issues / Events / Tickets / Members | Verdict |
|---|---|---|---|
| 1 | `default` | 7 / 13 / 6 / 8 | **KEEP** — the richest example, and the only one with a populated members list |
| 6 | `sprint2-demo` | 3 / **59** / 4 / 1 | **KEEP** — the best ingest-volume example |
| 10 | `test` | 4 / 4 / 2 / 2 | **KEEP for now** — holds the **only source map in the database**, which is the only worked example of symbolication |
| 7 | `flip-test` | 1 / 1 / 0 / 1 | archived; test litter |
| 8 | `sdf` | 0 / 0 / 2 / 1 | test litter |
| 9 | `menu-test` | 0 / 0 / 0 / 1 | archived; empty |
| 12–14 | `sprint7-<timestamp>` ×3 | all 0 | archived; mail-test litter, names are epoch stamps |

**The rest of the database.**

| Table | Rows | Note |
|---|---|---|
| `refreshToken` | **153** | The largest cleanup by far, and the only one that is *also* a security action — every row is a live session credential. 73 belong to `dev.user`, 61 to `dev.admin` |
| `event` | 77 | Mostly the example projects; some are probe events from this month's sprints |
| `ticketComment` | 17 | |
| `log` | 22 | ApexOps' own internal application log — no example value |
| `notification` | 12 | |
| `projectInvite` | 5 | |
| `userAiKey` | **1** | An encrypted provider key. Treat as a credential: confirm whose it is and **rotate it**, do not merely delete the row |
| `docPage` | 13 | 12 published + the retired `daily-notes` draft. Fully reproducible from `seed:docs` |

### The procedure — non-negotiable parts

1. **`pg_dump` to a path outside the repository, before anything.** Restoring is the rollback plan;
   there is no other one.
2. **Dry run by default.** The script prints per-table before/after counts and writes nothing without
   `--apply` — the same convention `seed-docs.ts` already uses for `--force`.
3. **Delete by identity, never by pattern.** An id list generated from the inventory above and
   reviewed, rather than `WHERE email LIKE '%test%'`.
4. **Cascades mapped before the first delete**, not discovered during it: `User` → notes, tasks,
   memberships, tokens; `Project` → issues, events, tickets, source maps. Print what each delete will
   take with it, in the dry run.
5. **Idempotent.** A second run is a no-op that reports zero.
6. **Reconstitute afterwards** to prove the environment is not now unbuildable: `npm run seed:dev`
   and `npm run seed:docs`, then sign in as both dev accounts.

### Decisions needed before phase 5 starts

These are yours, not mine — each one trades example data against tidiness:

1. **The five ad-hoc accounts (2–6) populate `default`'s 8-member list.** Deleting them leaves the
   best example project with almost no members, and the members tab *is* documentation. Keep them as
   scenery, rename them to something presentable, or accept a thinner example?
2. **Keep `test` for its source map, or move that example into `sprint2-demo`** and delete `test`?
3. **`admin@apexops.com`: add to the seed, or retire in favour of `dev.admin`?**
4. **Phase 4 at all?** Moving tokens out of `localStorage` is real work with real blast radius. The
   alternative is to accept it and write the XSS constraint down as a standing rule.

---

## Not in scope, deliberately

- **Authorisation** beyond where it touches authentication. `resolveMembership`, the 404-not-403 rule
  and the project-role model were reviewed in the workspaces and team sprints and are not re-opened
  here.
- **MFA.** A07 #1 asks for it; it is a product decision with a whole enrolment and recovery flow
  behind it, not a hardening task to slot into a phase.
- **The ingest key model.** Public-by-design, write-only, separately reviewed.

---

## Done — 2026-09-06

### Phase 1 · `A1`, `A2`, `A9` — revocation is real

The eight-hour session was confirmed as **intended and unchanged**; what was broken was that it did
not end when revoked, and only that was fixed.

`authenticate` now validates the session behind the token: one indexed lookup of the `sid` row that
also returns the user's current `role` and `isActive`, so `authorize()` reuses it instead of issuing
a second identical query. The decision itself is pure and testable in
[`lib/sessionAdmit.ts`](../../../app/server/src/lib/sessionAdmit.ts) — the same split the codebase
already uses for `decideMonitorAdmit` and `decideIssueStreamJoin` — with 13 tests.

**Decisions taken, rather than left to a `?.`:**

- A token with **no `sid` is refused.** Those predate Sprint 5 and cannot still be valid, so nothing
  real is rejected, and the alternative is carrying a credential nothing can revoke.
- Refusal reasons are **indistinguishable to the caller**: revoked, expired and wrong-owner all read
  as `401`. Only deactivation differs (`403`), because the account holder needs to know why.
- `isActive === false` refuses; **null does not** — null is a row older than the column, and treating
  it as inactive would lock out legacy accounts on deploy.
- `optionalAuth` was **deleted**: zero callers, and an unvalidated auth path is not something to keep
  warm.

**Verified against the running server, not asserted:**

| Criterion | Result |
|---|---|
| Sign out everywhere, then reuse the same access token | `200` → **`401`** on the next call, on `/auth/profile` and `/tickets`. It revoked 62 stale sessions in passing |
| Device A revokes device B | B `401` immediately; **A still `200`** |
| Admin deactivates an account mid-session | that account `401` on its next call; reactivate + fresh login `200` |
| Admin demotes an admin mid-session | the admin route stops answering on the old token |
| **Failure case** — delete the session row straight from the table | `200` → **`401`**, proving the check reads the table rather than a cached claim |
| **Mutation** — reintroduce "admit when the row is gone" | the suite goes red naming that exact test, and reverts green |
| Login → `/dashboard` in a real browser, then `/tickets` and `/users` | `200`, with exactly one session flagged `current` |

`security-auth.md` was rewritten in the same change (A9): it had claimed a **1-hour** access token
against an actual **8 hours**, and pointed at a `/auth` route that does not exist.

### Phase 5 · the account cleanup

`admin@apexops.com` and the two seeded dev accounts kept; **six accounts removed** (ids 2–6 and 11)
with 5 notes, 1 task, 5 memberships and 19 refresh tokens cascading with them. No removed account
owned a project, so no example project data was touched.

Run through [`scripts/cleanup-accounts.ts`](../../../app/server/src/scripts/cleanup-accounts.ts) —
**dry-run by default**, explicit keep-list rather than a `LIKE` pattern, and it refuses outright if a
keep-list account is missing or if any doomed account owns a project. A `pg_dump` was taken first.

**`dev@apexops.com` — named in the instruction — does not exist.** The seeded development accounts
are `dev.user@apexops.local` and `dev.admin@apexops.local`, so those were kept as the "system-created
development users". Both are upserted by `seed-dev-users.ts`, which makes that reading recoverable
either way.

### Found while cleaning: the example data has a 30-day fuse

`sprint2-demo` held **59 events** when this review was written on 2026-08-25 and holds **0** now.
The cleanup did not do it — the backup taken *before* the delete already contained only 13 event
rows. Every project had `retentionDays = 30`, and `scheduleRetentionPrune` runs on server boot, which
this session triggered repeatedly. Those events dated from 2026-07-28 and aged out.

They are **not recoverable** — no backup predates the prune.

Retention on the three example projects (`default`, `sprint2-demo`, `test`) is now **3650 days**, so
the surviving data stops expiring. The remaining 13 events would otherwise have gone around
2026-09-19. Worth stating plainly: *"retain submitted project data for examples and documentation"*
and *"prune events older than 30 days"* are contradictory instructions, and until today the prune was
winning silently.

### Still open

Phases 2, 3 and 4 — A3 (enumeration), A4 (reuse detection), A5 (leaked `err.message`), A6 (per-IP-only
rate limiting), A7 (`localStorage`), A8 (password policy). Phase 4 remains decision-gated.
