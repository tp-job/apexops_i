# Platform hardening — CI, tests, email delivery, and the open AI proxy (G0 scope)

> Status: **scoped 2026-08-04**, decisions `E-D1`…`E-D6` locked below.
> Owner: full-stack + release. This is Sprint 7 in
> [`sprint-plan.md`](../planning/sprint-plan.md), which listed it as
> *"Docs + AI Chat, CI on PR, email delivery for alerts **and** invites"* and named its blocking
> question as mail infrastructure.
>
> Scoping it changed the shape. Two of the three planned items were smaller than the plan assumed and
> one thing not on the plan at all is the most urgent work in it.

## What scoping found

### 1. `POST /api/ai/chat` is an open, unmetered LLM proxy

[`api/ai.ts`](../../../app/server/src/api/ai.ts) has **no `authenticate`**, no rate limit, and no
input cap. It is mounted at `/api/ai` alongside every other route. Verified against the running
server on 2026-08-04:

```
POST /api/ai/chat   (no Authorization header)
→ 400 {"error":"Invalid request to AI service",
       "details":"API key not valid. Please pass a valid API key."}
```

That error came **from Google**. The request left the building. The only reason it cost nothing is
that this machine's `GEMINI_API_KEY` is a placeholder — in any deployment with a working key, anyone
on the internet who can reach the host has free, unlimited, unattributed use of the account's Gemini
quota, at 8192 output tokens per call, billed to whoever owns the key.

This is the worst outcome available in this sprint, it is one line to trigger from a browser console,
and it is not on the plan. **It is P0 and it goes first.**

### 2. "Docs + AI Chat" is otherwise already built

[`Chat.tsx`](../../../app/client/src/pages/Chat.tsx) is 339 lines and shipped; the plan's own re-cut
table already recorded that. [`Docs.tsx`](../../../app/client/src/pages/Docs.tsx) is 256 lines and
gained a source-maps section in Sprint 4. There is no 3-day UI build hiding here — there is a
security hole wearing a feature's name.

### 3. "CI on PR" is not the real gap; **having anything to run** is

There is no `.github/workflows`, and there is no test runner in either workspace — `app/server`'s
`test` script is still `echo "Error: no test specified" && exit 1`. **Four consecutive sprints have
closed with "no automated tests" as their first known gap** (bug tracker, source maps, auth refresh,
settings). Adding CI that runs `tsc` and a build is worth doing and takes an hour; adding CI without
tests would institutionalise the gap rather than close it.

### 4. Email is genuinely blocked — but far less than the plan assumed

The plan is right that a production sending domain with SPF/DKIM/DMARC is not an afternoon, and it is
not something this build can provision. But that blocks **delivery to real inboxes**, not the
feature. SMTP against a local catcher is real SMTP: real connection, real message, real MIME, real
headers. The whole path is verifiable today, and production becomes an env change.

---

## Decisions

### E-D1 — The AI proxy gets authentication, a per-user quota, and input caps, in that order

Authentication alone is not enough. A signed-in user with a loop is the same bill as an anonymous one
with a loop, and this endpoint has no cost ceiling of any kind: no prompt length limit, no history
length limit, and `maxOutputTokens: 8192`.

All four, because each closes a different door:

| Control | Closes |
| --- | --- |
| `authenticate` | The internet |
| Per-user rate limit | The signed-in loop, accidental or not |
| Prompt + history caps | The single enormous request |
| `maxOutputTokens` reduced | The cost per call, everywhere |

**The key is also read at request time rather than at module load**, so `/status` cannot report
"ready" for a key the process no longer has. It is a `const` captured at import today, which is a
smaller problem than the missing auth but is the same class of thing.

### E-D2 — Vitest in both workspaces, and the first suite covers the functions four sprints have promised to cover

Not a token test. Every sprint's known-gaps list has named the same pure functions as "the first
things worth covering when a runner exists":

- `lib/stackFrames.ts` — `parseStack`, Chrome and Firefox frames, unrecognised lines kept verbatim
- `utils/timezone.ts` — `resolveTimeZone` on the display format, and the `+7h` shift trap
- `lib/sessions.ts` — `resolveSessionTimeoutMinutes` clamping
- `lib/fingerprint.ts` — the grouping key that decides whether two errors are one issue
- `utils/timezones.ts` (client) — `timezoneOptions` keeping an unknown stored value

Vitest rather than Jest: the client is already Vite, so the client workspace needs no new transform
pipeline, and using one runner across both workspaces means one config idiom to learn. The server pays
a small tax (Vitest transpiles its TS itself) which is cheaper than running two runners.

**These are chosen because they are pure and load-bearing, not because they are easy.** A regression
in `fingerprint` silently merges unrelated errors; a regression in `resolveTimeZone` moves every date
on the calendar by seven hours. Both have already gone wrong once in this repo's history.

### E-D3 — CI runs on pull requests and pushes to `main`, and it **only checks — it never deploys**

Typecheck both workspaces, lint the client, run both test suites, build the client. Postgres is
started as a service container only if a test needs it; the first suite does not, and keeping it that
way keeps CI under a minute.

**Explicitly no deploy step, no publish, no release automation.** This repo has had no pipeline at
all; the first one must not be something that ships code as a side effect of a merge. Adding delivery
later is a decision someone should make on purpose.

### E-D4 — Email is a driver behind an interface, and "not configured" is a first-class state

Three drivers: `console` (default — logs the rendered message), `smtp` (nodemailer), and `noop`.
Selection is by env, and the effective driver is reported on a status endpoint the same way
`/api/ai/status` reports the AI key.

This is **not** the decorative-toggle pattern Sprint 5 spent itself removing, and the difference
matters: a decorative toggle claims an effect it does not have and gives the user no way to tell. A
mail driver reports exactly what it will do, refuses to claim otherwise, and changes behaviour the
moment it is configured. Nothing in the UI promises "we emailed them" unless a send actually
succeeded.

### E-D5 — Sending is verified against a real SMTP server, locally, or it does not count

A `mailpit` service in `docker-compose.yml`: real SMTP on 1025, a web UI and a JSON API on 8025. The
acceptance test sends an invite and then **reads the message back out of Mailpit's API** — asserting
on the recipient, the subject and the presence of the working invite URL.

That is the difference between "the code calls `sendMail`" and "an email arrived containing a link
that works". Only the production domain remains the operator's problem, and that is written down
rather than implied.

### E-D6 — Email is wired to invites first, and to regression alerts second

Invites are where email changes the product most: today
[`api/team.ts`](../../../app/server/src/api/team.ts) returns an `inviteUrl` in the response and the
inviter copies and pastes it out of band. That is the whole delivery mechanism.

Regression alerts already have two channels that work — the in-app feed (written first and
unconditionally) and an optional webhook. Email is a third, and it inherits the existing rule:
**alerting failures never fail the request they ride on**, because this runs inside ingest and a mail
timeout must not turn someone's error report into a 500.

Per S-D4 in [`settings.md`](./settings.md), alert routing is **per project**, not per account. The ten
inert per-account notification toggles stay inert and stay absent.

---

## Out of scope, named so it does not leak in

- **A production sending domain, SPF/DKIM/DMARC, and a deliverability posture.** Operator work. The
  spec says what to set; it cannot set it.
- **Email templates beyond plain text plus a minimal HTML part.** A template system is a project.
- **Bounce and complaint handling, unsubscribe management, a suppression list.** All real, all
  required before bulk sending, none required to deliver a transactional invite.
- **Email-change verification** — still deferred, and still for the reason `settings.md` gave.
- **`GET /api/invites/mine`**, the Sprint 6 gap that would make the bell's invite row actionable.
  Adjacent, genuinely useful, and not this sprint — it is a product decision about how an invitee
  discovers an invite, and email answers the same question from the other side. Revisit *after* email
  ships, with the evidence.
- **Deploy automation.** See E-D3.
- **Streaming AI responses, conversation persistence, per-project AI context.** The proxy is being
  secured, not extended.

---

## Risks / pre-mortem

| Risk | Impact | Mitigation |
|---|---|---|
| The AI fix stops at `authenticate` and the cost ceiling is forgotten | A signed-in loop bills the same as an anonymous one; the hole is "closed" and still open | E-D1 makes all four controls one gate, with a ledger feature that asserts on the quota, not just the 401 |
| CI lands with a trivial suite and the gap is declared closed | Five sprints of "no automated tests" becomes "we have tests" while nothing load-bearing is covered | E-D2 names the exact functions, chosen for consequence; the ledger asserts a real bug is caught |
| Email ships unverifiable and becomes the next inert feature | Exactly what Sprint 5 spent itself removing | E-D5 makes a received message the acceptance criterion, not a successful function call |
| CI becomes a deploy pipeline by accident | A merge ships code nobody decided to ship | E-D3 forbids it in the spec, and the workflow has no credentials to deploy with |
| Mail send blocks or slows ingest | An error report 500s because a mail server was slow | E-D6 inherits the existing alerting rule; sends are fire-and-forget with a timeout, never awaited on the request path |
| CI is green locally and red in Actions | The pipeline is disabled within a week | Both suites must pass from a clean `npm ci` before the workflow is called done |
