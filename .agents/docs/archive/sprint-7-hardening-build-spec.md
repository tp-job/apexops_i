# Build spec — Sprint 7: platform hardening

Ledger: [`feature-list.json`](feature-list.json) · Log: [`progress.md`](progress.md)
**Decisions live in [`platform-hardening.md`](.agents/docs/features/platform-hardening.md)**
(`E-D1`…`E-D6`). This file does not restate them — that is the rule the plan's re-cut exists to
enforce.

---

## 1. Problem statement

Sprint 7 was the last unscoped row in the plan: *"Docs + AI Chat, CI on PR, email delivery for alerts
and invites."* Scoping it on 2026-08-04 found the three items are not the same size, and that the
most urgent work in the sprint was not on the list:

1. **`POST /api/ai/chat` has no authentication, no rate limit and no input cap.** Verified live: an
   unauthenticated request reached Google. With a valid key in the environment, it is a free LLM
   proxy for anyone who can reach the host.
2. **Docs and AI Chat are otherwise built.** No UI work is hiding there.
3. **"CI on PR" is not the gap — having something to run is.** No test runner exists, and four
   consecutive sprints have closed with "no automated tests" as their first known gap.
4. **Email is blocked on a production domain, but not on being built or verified.** Real SMTP against
   a local catcher exercises the entire path.

**Sprint goal:** *the AI endpoint cannot be used by a stranger or looped by a friend; a pull request
runs a suite that would actually catch a regression; and inviting someone sends them an email we can
read back and click.*

## 2. Acceptance criteria

**AI proxy**

1. `POST /api/ai/chat` without a bearer token answers 401 and **no outbound request is made** to the
   model provider.
2. A signed-in user exceeding the per-user quota answers 429, and a different user is unaffected.
3. An oversized prompt or history is refused with 400 before any outbound request.
4. `GET /api/ai/status` requires auth and reports the key state read at request time.

**Tests**

5. `npm test` runs from the repo root and executes both workspaces' suites.
6. The suite covers `parseStack`, `resolveTimeZone`, `resolveSessionTimeoutMinutes`, `fingerprint`
   and `timezoneOptions`, including each one's known trap.
7. Deliberately reintroducing a real past bug turns the suite red. Asserted by doing it, not claimed.

**CI**

8. A workflow runs on pull requests and pushes to `main`: typecheck both workspaces, lint the client,
   run both suites, build the client.
9. The workflow contains no deploy, publish, or release step, and no deployment credentials.
10. It passes from a clean checkout and `npm ci`, not only from this working tree.

**Email**

11. With no mail configuration, the app starts, the status endpoint says `console`, and nothing
    claims an email was sent.
12. With SMTP configured, inviting someone results in a message **retrieved from the mail server**
    whose recipient, subject and body-embedded invite URL are all correct, and that URL accepts the
    invite.
13. A mail server that is down or slow does not fail, delay, or 500 the request that triggered the
    send — for both invites and regression alerts.
14. A regression alert emails project members who should receive it, and does not email anyone when
    the project has alerting off.

## 3. Out of scope

See [`platform-hardening.md`](.agents/docs/features/platform-hardening.md) § *Out of scope*. Load
bearing summary: no production sending domain, no bounce/unsubscribe handling, no deploy automation,
no `GET /api/invites/mine`, no AI streaming or persistence.

## 4. Data contract

No schema changes are expected. If regression-alert email needs a per-project recipient rule beyond
what `Project.alertOnRegression` already expresses, that is a decision, not an implementation — it
goes back to the spec.

New environment variables, all optional, all with a safe default:

| Var | Default | Meaning |
|---|---|---|
| `MAIL_DRIVER` | `console` | `console` \| `smtp` \| `noop` |
| `MAIL_FROM` | `ApexOps <no-reply@localhost>` | Envelope and header sender |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Mailpit in development |
| `SMTP_USER` / `SMTP_PASS` | unset | Omitted entirely when unset — not sent as empty strings |
| `SMTP_SECURE` | `false` | TLS on connect |
| `AI_RATE_LIMIT_PER_HOUR` | `30` | Per-user quota on the AI proxy |

## 5. Failure behaviour and edge cases

| Case | Required behaviour |
|---|---|
| No `GEMINI_API_KEY` | 503 with a clear message; still requires auth first, so the 401 wins |
| AI quota exceeded | 429 naming when it resets; the quota is per user, never per IP |
| Prompt over the cap | 400 before any outbound call — the cap is a cost control, so it cannot run after the spend |
| Mail driver `console` | Renders and logs; the caller is told the message was **not** sent |
| SMTP unreachable | Logged, swallowed; the invite is still created and its URL still returned |
| SMTP slow | Bounded by a timeout, never awaited on the request path |
| Invite email to an address that does not exist as a user | Still sent — that is the entire point of an invite |
| Project with `alertOnRegression: false` | No email, no work done at all |
| Test suite needing a database | It must not. If one does, it is an integration test and CI gains a service container as a deliberate step |
| CI on a fork PR | Must not need secrets, so it must still pass without them |

## 6. Verification approach

- **The AI 401 is asserted with an outbound-request counter**, not just a status code. "Refused" and
  "refused before spending money" are different claims.
- **The test suite's value is proven by breaking something.** Criterion 7 is a real past bug
  reintroduced and the suite going red.
- **Email is verified by reading the message back** out of Mailpit's API — recipient, subject, and a
  clicked invite URL. A successful `sendMail` call is not evidence.
- **CI is verified from a clean checkout**, because a workflow that only works in this working tree
  is the one that gets disabled.

## 7. Known gaps carried in

- `POST /api/console-logs` is also unauthenticated. It is an ingest-shaped endpoint like
  `/api/ingest`, so this may be correct — but it has no key, no origin check and no rate limit,
  unlike ingest. **In scope to establish which it is**, and to close it if the answer is "hole".
- `middleware/validate.ts`'s `validateQuery` is still exported and still broken under Express 5
  (Sprint 5 gap 4). It is dead code that will mislead the next caller; removing it is a candidate for
  this sprint's cleanup, and a good first thing for the new suite to make safe.
