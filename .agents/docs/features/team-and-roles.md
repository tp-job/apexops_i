# Team invites + roles that mean something — feature spec

> Status: **G1 + G2 shipped 2026-08-01 (backend complete). G3–G5 open — all three are UI.**
> Owner: product + full-stack. Scheduled **Sprint 6**.
> Closes the sprint plan's carried-forward item 1 (*"`authorize()` has one caller"*) at the
> project level, and turns [`project-workspaces-and-sdk.md`](project-workspaces-and-sdk.md)'s
> `ProjectMember` table — modelled on day one, never given a UI — into a real sharing model.

## The load-bearing findings

Three, and they reorder the sprint.

### 1. There is still no mail infrastructure, so "invite" cannot mean "send an email"

[`alerting-and-account-settings.md`](alerting-and-account-settings.md) established this and nothing
has changed: no nodemailer, SMTP, SendGrid or Resend anywhere in `app/server`. A spec that says
"invite a teammate by email" is quietly specifying a sending domain, SPF/DKIM and a deliverability
problem. **The invite is a link the inviter delivers themselves** (T-D1). That is not a compromise
to be replaced later — it is the honest shape of the feature until mail exists, and it is what the
`Notification` table already makes good for the common case.

### 2. Project roles are *not* in the JWT — so this sprint does not inherit the token-staleness risk

The sprint plan carries *"token invalidation on role change"* as its highest-risk single line. Read
against the code, that risk belongs to **`User.role`** (the global `admin`/`user` string, signed into
the token, gating exactly one endpoint: `DELETE /api/logs`). `ProjectRole` is different: every
project route resolves it per request through
[`resolveMembership`](../../../app/server/src/lib/projectAccess.ts), which reads
`project_members` on each call.

**Consequence: demoting or removing a project member takes effect on the next request, with no token
work at all.** The sprint is materially cheaper than the plan priced it, and the carried-forward risk
stays open but is now correctly scoped to the global role — which this sprint does not touch.

### 3. Scoping this found a live PII leak in ticket assignment

[`api/tickets.ts:264`](../../../app/server/src/api/tickets.ts) validates `assigneeId` as *"is a known
user"* and nothing more:

```ts
const assignee = await prisma.user.count({ where: { id: assigneeId } });
if (!assignee) { res.status(400).json({ error: 'Assignee is not a known user' }); return; }
```

`formatTicket` then returns `assigneeUser` selected with
`{ id, firstName, lastName, email, avatarUrl }`. So **any authenticated user can create a ticket in
their own project with `assigneeId: 1, 2, 3…` and read back the name, email and avatar of every user
in the database** — including users with no relationship to them. It is a user-enumeration oracle
reached with a small integer.

It is here rather than in a security pass because the correct check — *is this user a member of this
ticket's project* — is precisely what this sprint builds. It is **P0 and first**.

> **Finding 3b, discovered building G1 (2026-08-01).** The leak was wider than the assignee field,
> and in the same direction. `memberProjectFilter` had been applied to the ticket *reads* (`GET /`,
> `GET /:id`, `GET /stats`) but **not to any write route or to comments**. `PUT /api/tickets/:id`,
> `DELETE /api/tickets/:id`, `POST /:id/restore`, `GET /:id/comments` and `POST /:id/comments` all
> addressed rows by bare integer with no project constraint — so any authenticated user could edit,
> archive, restore and comment on tickets in any workspace, and read the full comment thread of a
> stranger's bug. Worse than the assignee oracle: that one disclosed a user directory, this one
> disclosed and *mutated* other tenants' work. Closed in G1 via `resolveTicketAccess`; the promote
> path in `api/issues.ts` carried a third copy of the assignee check and was fixed with it.

---

## Locked decisions

### T-D1 — An invite is a bound, hashed, expiring token; the link is the delivery channel

`POST /api/projects/:slug/invites` takes an email and a role and returns a **one-time link**, shown
once, the same way the rotate-key flow already treats a value that cannot be re-displayed. The
inviter pastes it into whatever channel they already use.

Three properties, each load-bearing:

- **Bound to the email.** Accepting requires being signed in as an account whose email matches
  (case-insensitively). A workspace contains production stack traces, source paths and user-facing
  error strings; an unbound link forwarded into the wrong Slack channel would admit a stranger to
  all of it. Binding turns a leaked link from a breach into a dead link.
- **Stored as a SHA-256 hash, never in plaintext.** Same reasoning as a password: reading the
  database must not hand over workspace access. The token exists in the response body once.
- **Expires in 7 days, and is revocable.** A pending invite is standing access waiting to be
  claimed. It should not be standing forever.

When the invited address already has an account, a `Notification` row is written too
(`NotificationKind.invite`). That is the common case in a small team and it costs one enum value.
When it does not, the link is the only channel — correctly, because open registration already exists
and the invitee can sign up and then accept.

### T-D2 — Accept does not live under `/:slug`

`POST /api/invites/:token/accept` is mounted at the API root, not under the project. Every route
under `/api/projects/:slug` goes through `resolveMembership`, which 404s a non-member **by design**
(a 403 there would confirm the slug exists and turn the route into a name-enumeration oracle). An
invitee is by definition not yet a member, so the accept route mounted there would 404 exactly the
person it exists for.

`GET /api/invites/:token` returns project name, inviter name and offered role for the accept screen.
That does disclose a project name to whoever holds the token — acceptable, because holding the token
is the thing the invite grants, and the screen is unusable without it.

### T-D3 — Three roles, all enforced. No `viewer`.

| Action | owner | admin | member |
|---|:--:|:--:|:--:|
| View issues, events, tickets, overview | ✅ | ✅ | ✅ |
| Change issue status, comment, create/edit tickets | ✅ | ✅ | ✅ |
| Project settings — name, capture levels, retention, alerts, webhook | ✅ | ✅ | ❌ |
| Rotate the ingest key | ✅ | ✅ | ❌ |
| Invite, change roles, remove members | ✅ | ✅ | ❌ |
| Archive / restore the project | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |

An **admin cannot modify the owner's row** — not their role, not their membership. Without that rule
`admin` is `owner` with extra steps, and any admin can lock the owner out of their own project.

**No read-only `viewer` role, deliberately.** Adding an enum value is cheap; adding a role that no
handler distinguishes from `member` is the exact failure
[`settings.md`](settings.md) S-D1 was written about — a control that reports success and enforces
nothing. `member` today can triage issues and file tickets, and this spec **locks that as intended**
rather than silently narrowing it. If a genuine read-only need appears, it arrives with the handler
changes that make it real.

### T-D4 — Exactly one owner, and the invariant is enforced in a transaction

Ownership is stored twice — `Project.ownerId` **and** a `project_members` row with role `owner` —
because [`api/projects.ts:161`](../../../app/server/src/api/projects.ts) deliberately created both so
authorization could stay a single membership lookup instead of "member OR owner" scattered across
every handler. That was the right call and it comes with a duty: the two must never disagree.

- Transfer is one transaction: demote the current owner to `admin`, promote the target to `owner`,
  update `Project.ownerId`. Any partial application produces a project whose settings screen and
  whose authorization disagree about who is in charge.
- The target must already be a member. Transfer-and-invite in one step is two failure modes wearing
  one button.
- Removing or demoting the last owner is a **409**, not a silent no-op.
- `POST /:slug/transfer-ownership` is owner-only and passes through `ConfirmDialog` — it is the one
  action in the product the actor cannot undo alone.

### T-D5 — Removal revokes access; it does not rewrite history

Removing a member (or leaving) runs one transaction:

| Their data | What happens | Why |
|---|---|---|
| `project_members` row | deleted | the access itself |
| Pending `ProjectInvite` for that email | revoked | otherwise removal is undone by an old link |
| `Ticket.assigneeId` on that project | **nulled**, with a system comment on each ticket | an assignee who cannot open the ticket is a silently stalled ticket — the board must say so |
| `Notification` rows for that project | **deleted** | they carry issue titles and regression details; leaving them in a removed member's bell is a post-removal leak of the workspace they just lost |
| `Ticket.reporterId`, `TicketComment.author` | **kept** | attribution is history, not access. Deleting it corrupts the record of who reported what, and they cannot read any of it without a membership row |

The assignee-nulling and the notification purge are the two that get forgotten. Both are named in the
exit test.

### T-D6 — Assignment is membership-checked, and the member list is not a user directory

Two halves of the same rule.

- `assigneeId` on create **and** update must resolve to a member of *that ticket's project*.
  Otherwise 400. This closes finding 3.
- **No `/api/users` search endpoint, no autocomplete over the user table.** Assignee pickers read
  `GET /:slug/members` — a list the caller is already entitled to. Inviting is by **exact email**,
  which returns the same `201` whether or not that address has an account. A partial-match user
  search would replace the integer-guessing oracle we just closed with a much more convenient one.

### T-D7 — Invites are rate limited and archived projects reject them

Invite creation is capped per project per hour, reusing the limiter pattern already on auth and
ingest. An uncapped endpoint that writes rows keyed on an arbitrary email address is a spam vector
that runs through our name. Inviting into an archived project is a 409 — an archived workspace has
stopped ingesting, and growing its membership is meaningless.

---

## Data model

```prisma
enum InviteStatus { pending accepted revoked  @@map("invite_status") }

model ProjectInvite {
  id          Int          @id @default(autoincrement())
  projectId   Int          @map("project_id")
  /// Lowercased at write time. The invite is BOUND to this address (T-D1):
  /// a forwarded link cannot admit a different account.
  email       String
  role        ProjectRole  @default(member)
  /// SHA-256 of the token. The token itself is returned once, at creation, and
  /// never stored — reading this table must not grant workspace access.
  tokenHash   String       @unique @map("token_hash")
  status      InviteStatus @default(pending)
  invitedById Int          @map("invited_by_id")
  expiresAt   DateTime     @map("expires_at")
  acceptedAt  DateTime?    @map("accepted_at")
  acceptedById Int?        @map("accepted_by_id")
  createdAt   DateTime     @default(now()) @map("created_at")

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  invitedBy User    @relation("inviteSender", fields: [invitedById], references: [id], onDelete: Cascade)

  /// One live invite per address per project. Re-inviting updates the row and
  /// mints a new token rather than accumulating duplicates in the pending list.
  @@unique([projectId, email])
  @@index([projectId, status])
  @@map("project_invites")
}
```

Plus `invite` added to `NotificationKind`.

## API surface

| Method | Route | Who | Notes |
|---|---|---|---|
| `GET` | `/api/projects/:slug/members` | any member | members always; pending invites only for owner/admin |
| `POST` | `/api/projects/:slug/invites` | owner, admin | `{ email, role }` → `201 { inviteUrl }`, shown once. Rate limited |
| `DELETE` | `/api/projects/:slug/invites/:id` | owner, admin | revoke |
| `GET` | `/api/invites/:token` | any authed user | accept-screen preview (T-D2) |
| `POST` | `/api/invites/:token/accept` | any authed user | 403 if the email does not match; 410 if expired or revoked |
| `PATCH` | `/api/projects/:slug/members/:userId` | owner, admin | role change. 403 on the owner's row |
| `DELETE` | `/api/projects/:slug/members/:userId` | owner, admin, **or self** | leave = remove yourself. 409 on the last owner |
| `POST` | `/api/projects/:slug/transfer-ownership` | owner | `{ userId }`, must already be a member (T-D4) |

## Gates

| G | Scope | Est |
|---|---|---|
| ~~**G1**~~ | ✅ **Shipped 2026-08-01.** Assignee membership check on ticket create + update **+ issue-promote** (closes finding 3); **every ticket write route and both comment routes scoped to membership** (closes finding 3b); permission matrix T-D3 asserted against the API on all six project routes; `canAdminister` joined by an explicit `isOwner` | 1.5d |
| ~~**G2**~~ | ✅ **Shipped 2026-08-01.** `ProjectInvite` + `InviteStatus` + `NotificationKind.invite` pushed; all eight routes live in [`api/team.ts`](../../../app/server/src/api/team.ts) (project-scoped) and [`api/invites.ts`](../../../app/server/src/api/invites.ts) (root-mounted, T-D2); SHA-256 token hashing in [`lib/invites.ts`](../../../app/server/src/lib/invites.ts), 7-day expiry, 20/hour **per project**, archived-project 409. **G5's three actions — leave, remove with the T-D5 transaction, transfer — shipped with it**, because they are the same three routes; G5 is now UI only. 59/59 exit assertions green against the running API | 2d |
| **G3** | `Select` primitive (**still unbuilt** — see the form-kit table in the sprint plan) + Members tab on `/p/:slug/members`: member rows, role editing, pending-invite list, invite dialog with copy-link | 2d |
| **G4** | `/invite/:token` accept screen — signed-out → login-then-return, wrong-email state, expired state; the `invite` notification | 1.0d |
| **G5** | *(P1)* Leave project, remove member with T-D5's transaction, transfer ownership with confirmation — **backend shipped in G2; what remains is the UI and the `ConfirmDialog` on transfer** | 1.5d → ~0.5d |

**Load: 6.5d at P0, 8.0d with P1 — 0.5d over a 7.5d capacity, named now rather than discovered in
week 2.** *Revised after G2: the remaining work is 3.5d of client, and the 0.5d overrun is gone —
G5's server half came free because removal, leaving and transfer are the same three routes G2 had to
mount anyway.*

**Cut order if it runs long:** pending-invite list polish → the `invite` notification (the link still
works without it) → G5's *leave project*. **Do not cut G1**, and do not cut ownership transfer out of
G5 without also cutting member removal — shipping "remove anyone" with no way to hand over the
project is how a workspace gets orphaned.

## Exit test

Run for real, two browsers, two accounts.

1. Owner invites `b@example.com` as `member`. Link copied once; reloading the page does not show it
   again.
2. Signed in as a **third** account, the link answers 403 — *"This invite was sent to another
   address."* Signed in as B, it joins. B sees the project in their switcher; the owner sees B in
   Members.
3. As B (`member`): the settings tab's controls are disabled, `PATCH /:slug` answers 403, rotate-key
   answers 403 — **checked against the API directly, not just the hidden button**.
4. Owner promotes B to `admin`. B's **next request** succeeds with no re-login (finding 2, proven).
5. B (now admin) tries to demote the owner → 403. Tries to remove the owner → 403.
6. A ticket assigned to B, then B is removed: B loses the project, the ticket reads *Unassigned* with
   a system comment, and B's notifications for that project are gone from their bell.
7. `POST /api/tickets` with `assigneeId` set to a non-member's id → **400**, and no email in the
   response body. Repeat across a range of ids; the oracle is closed.
8. Owner transfers to B, then confirms `Project.ownerId` and the `owner` member row name the same
   person. Old owner is `admin` and can no longer archive.
9. Last owner attempting to leave → 409.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Ownership drifts between `Project.ownerId` and the member row** | The settings screen and authorization disagree about who is in charge — unfalsifiable from the UI | One transaction (T-D4); step 8 of the exit test asserts both, not one |
| A forwarded invite link admits a stranger to production stack traces | Cross-tenant disclosure of the exact data the product exists to hold | Email binding (T-D1), asserted in exit step 2 |
| The assignee leak is treated as a nice-to-have and slips behind the UI work | It is live in `main` today | G1 is first in the sprint, not last, and does not depend on any new table |
| Pending invites rot into a list of 40 dead rows | The Members panel stops being trustworthy | 7-day expiry, one live invite per address, revoke in the same panel |
| `Select` is unbuilt and every role control needs one | A form-kit estimate is low again — the third sprint running | Priced inside G3 explicitly, not assumed |
| Removal leaves work assigned to someone who cannot see it | Tickets stall silently — the failure mode this product exists to prevent | T-D5, exit step 6 |

## Not in scope

- **Organisations / teams as an entity.** Membership is per project. A cross-project team is a second
  authorization model, and two of those is how one of them stops matching the other.
- **Email delivery of invites.** Blocked on the infrastructure named at the top. `ProjectInvite` is
  the seam to hang it off — sending mail becomes an addition, not a redesign.
- **Global `User.role` and token invalidation on role change.** Still open, still real, still scoped
  to `DELETE /api/logs`. Finding 2 explains why it does not block this sprint.
- **Per-issue assignment rules**, deferred by the workspaces spec and still deferred.
