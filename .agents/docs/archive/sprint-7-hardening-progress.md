# Progress — Sprint 7: platform hardening

Spec: [`build-spec.md`](build-spec.md) · Decisions:
[`platform-hardening.md`](.agents/docs/features/platform-hardening.md) · Ledger:
[`feature-list.json`](feature-list.json)

## 2026-08-04 — complete. 19/19 features, 77 verification assertions, criteria 1–14 met.

Scoping the last unscoped row in the plan changed its shape. Two of the three planned items were
smaller than assumed, and **the most urgent work in the sprint was not on the plan at all.**

## The thing that was not on the plan

**`POST /api/ai/chat` had no authentication, no rate limit and no input cap.** Verified live before
touching anything:

```
POST /api/ai/chat        (no Authorization header)
→ 400 {"details":"API key not valid. Please pass a valid API key."}
```

That error came **from Google**. The request left the building. The only thing between that and a
bill was a placeholder key on this machine — in any deployment with a working key, anyone who could
reach the host had free, unattributed use of the account's Gemini quota at 8192 output tokens a call.

Four controls, because each closes a different door, and authentication alone would have looked like
a fix while leaving the cost ceiling at infinity:

| Control | Closes |
| --- | --- |
| `authenticate` | the internet |
| per-user quota (keyed on user id, not IP) | the signed-in loop |
| prompt + history caps | the single enormous request |
| `maxOutputTokens` 8192 → 2048 | the cost of every call |

Ordering matters as much as presence: **every refusal happens before the outbound call.** A cap that
runs after the spend is a log message, not a cost control.

## And a second one, found while resolving a "known gap"

`POST /api/console-logs` was flagged in the build spec as *"possibly an ingest endpoint, establish
which"*. It was a hole, and a bigger one than missing auth: it took an **arbitrary URL from an
unauthenticated request and drove a headless Chrome to it.** That is server-side request forgery by
construction — the caller picks any address the *server* can reach, including
`http://169.254.169.254/`, which on most cloud providers hands out instance credentials to anything
asking from inside the instance.

Now `authenticate` + `authorize('admin')` + a rate limit + [`lib/urlGuard.ts`](app/server/src/lib/urlGuard.ts),
which resolves the hostname and refuses private, loopback, link-local and reserved addresses. It
**resolves DNS rather than pattern-matching**, because blocking the string "localhost" stops nothing —
`127.0.0.1.nip.io` resolves to loopback and so does any attacker's own domain.

Gated rather than retired: a hardening sprint should not delete a feature, and nothing in the client
called it, so the gate broke nothing.

## The four-sprint gap, closed and proven

There was no test runner. `app/server`'s script was `echo "Error: no test specified" && exit 1`, and
**four consecutive sprints closed with "no automated tests" as their first known gap.**

59 tests now run from `npm test` at the repo root, covering exactly the functions those gap lists kept
naming — chosen for consequence, not for ease:

- **`fingerprint`** decides whether two errors are one issue. Too loose and unrelated bugs merge
  invisibly; too tight and one render loop becomes 100,000 rows.
- **`resolveTimeZone`** has already gone wrong once here. A regression moves every date on every
  calendar.
- **`parseStack`**, whose quiet promise is that a line it cannot read is kept verbatim rather than
  dropped from an incident stack.

**A suite that has never caught anything is a hypothesis, so it was tested by breaking things:**

| Reintroduced | Result |
| --- | --- |
| `resolveTimeZone` no longer stripping the `(GMT+7)` display suffix | RED — *"parses the display format actually stored in User.timezone"*, exit 1 |
| Fingerprint's NUL separator "tidied" into a space | RED — *"is not fooled by a separator that appears inside the message"* |

Both reverted, both green.

**It also caught a bug in my own code on its first run.** `urlGuard` used
`addSubnet('::ffff:0:0', 96)` to cover IPv4-mapped addresses — Node normalises an IPv4 argument into
that range before comparing, so that one line made the guard **block the entire public internet**
while reading as correct.

## CI, and what it found on day one

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests and pushes to `main`:
`npm ci`, prisma generate, typecheck both workspaces, lint, both suites, both builds.

**Checks only — no deploy, no publish, no release, and no secrets.** This repo had no pipeline at
all; the first one must not be something that ships code as a side effect of a merge. Needing no
secrets also means a fork PR runs the same checks rather than silently skipping them and reporting
green.

Two real problems surfaced from verifying it against a genuinely clean checkout rather than this
working tree:

1. **`package-lock.json` was gitignored.** `npm ci` cannot run without it, so CI was impossible — and
   no install in this repo's history has been reproducible. That is the direct cause of a bug already
   paid for: Sprint 4's npm silently deduped `source-map` to a hoisted 0.5.7 with a different,
   synchronous API than the pinned 0.7.4. Now tracked, with the reason recorded in `.gitignore`.
2. **A pre-existing lint error** in [`api/client.ts`](app/client/src/api/client.ts) that would have
   made the very first pull request red. The `_skip` rest-destructure is the one honest way to omit a
   property, and the default rule flags it; the config now honours the `_` convention.

## Email, and the part that was genuinely blocked

The plan named the blocking question as *mail infrastructure — a sending domain and SPF/DKIM, not an
afternoon.* That is true, and it blocks **delivery to real inboxes**. It does not block the feature.

Three drivers behind one interface — `console` (default), `smtp`, `noop` — with the effective driver
reported at `/api/mail/status`. **`SendResult.sent` is false for the console driver**, deliberately:
nothing claims a message was sent unless one was. That is the line between this and the ten inert
toggles Sprint 5 removed.

**Verified by reading messages back off the wire, never by a resolved `sendMail` promise.** Mailpit is
in `docker-compose.yml` for this; Docker Desktop's engine was down on this machine, so verification
used a real in-process SMTP server — a full `EHLO`/`MAIL FROM`/`RCPT TO`/`DATA` session over TCP, with
nodemailer as an unmodified client.

The invite assertion is the one that matters, and it is criterion 12 exactly: the token was extracted
**from the delivered message** — after decoding quoted-printable soft line breaks, which split a
71-character invite URL across two lines — and used to accept the invite successfully.

Both channels inherit the existing alerting rule: **sends are detached and bounded by a timeout, never
awaited on the request path.** Regression alerting runs inside ingest, so this was asserted directly:
with SMTP unreachable, ingest still succeeds, is not slowed, and the in-app rows are still written
first.

## Known gaps

1. **DNS rebinding is not solved** by `urlGuard`. The name can resolve to a public address at check
   time and a private one when Puppeteer fetches it moments later; closing that needs the fetch pinned
   to the checked address, which `page.goto` does not expose. This is why the route is *also*
   admin-gated and rate-limited rather than relying on the guard alone.
2. **Every test is a unit test.** Nothing covers a route end to end, so the API-level assertions in
   this sprint were scripted by hand and are not in CI. The next honest step is a small integration
   project with a Postgres service container — a deliberate change, not something to let accrete.
3. **The AI quota is in-memory and per process.** Same limitation as the auth limiters, and it now
   matters slightly more because this one guards a bill. Horizontal scaling multiplies every limit by
   the instance count.
4. **No bounce, complaint, or unsubscribe handling**, and no production sending domain. Transactional
   invites are fine; anything resembling bulk sending is not, and needs a deliberate deliverability
   posture first.
5. **`consoleLogsAPI.fetchFromUrl`** in the client has no caller and now points at an admin-only
   endpoint. Dead code; left in place rather than widening this sprint's diff.
6. **Retiring `POST /api/console-logs`** in favour of `api/console-monitor.ts` is worth deciding. It
   is now safe, but it spawns a browser with `--no-sandbox` for a feature nothing calls.
