What ApexOps actually does, surface by surface. Everything on this page is shipped and reachable in the app today — if something is planned rather than built, it says so.

## The spine: errors become work

An error in someone's browser becomes a row you can act on, in four steps:

1. **Ingest** — the SDK posts to one endpoint, authenticated by the project's public write-only key.
2. **Grouping** — identical errors collapse by fingerprint into a single **issue** with a count.
3. **Triage** — resolve, ignore, or promote. A resolved issue that fires again returns as a **regression**.
4. **A ticket** — promotion carries the culprit, count, first-seen and latest stack onto the board.

Everything else in the product exists around that loop.

## Issues

Per project, at **Issues**.

- Server-side filtering, sorting and paging, with the filter **in the URL** — a filtered list can be pasted to a colleague and it opens the same way.
- **Live**: the list patches counts in place as errors arrive, without a refetch and without reordering under your cursor. New issues that do not match your active filter are counted in a banner rather than injected, because a row appearing that contradicts the filter reads as a broken filter.
- A three-state connection badge — *live*, *reconnecting*, *offline* — that never reads *live* over a dead connection.
- Detail carries the latest event with **symbolicated** frames, a timeline, and a breakdown by browser, OS and release.

## Bug tracker

At **Bug Tracker** for everything you can see, or the **Board** tab inside a project.

- Tickets have status (`open`, `in progress`, `resolved`, `closed`), priority (`low` to `critical`), an assignee and a reporter, tags, and comments.
- Every ticket belongs to a project.
- Deleting **archives**; a ticket can be restored. Nothing on the board is destroyed by a single click.

:::callout{tone=warn title="The board does not stream"}
The live connection described above is on the **issue list**. The ticket board fetches when you open it and when you change something. That is a real difference, and it is written here rather than implied.
:::

## Source maps

Upload a map per release and stacks resolve to your original files. Two properties worth knowing:

- Maps are stored in the database, never written to disk.
- Symbolication happens when you **read** an issue, not when the event arrives — so a map uploaded after a deploy retroactively fixes stacks that were already captured.

## Tasks

At **Tasks**: everything planned, across every day, filterable by *to do*, *overdue*, *done* and *all*, with search.

**Overdue** means a deadline that has passed on unfinished work — not simply something planned for an earlier day, which is ordinary backlog.

## Notes & Calendar

At **Notes & Calendar**: one set of notes, two views.

- A rich editor — headings, lists, quotes, code, colour, links, images — the same one everywhere, so a note never loses its formatting depending on which screen you opened it from.
- Colours, tags, pinning and search, with tag chips that filter the list in one click.
- A note can be **scheduled onto a future day**, which is what makes the month grid a plan rather than a record of what you happened to write.
- Days resolve in **your** timezone, so two people in different places see a note on the correct local day.

## Calendar events and the day view

Events are first-class alongside notes and tasks. An event that crosses midnight appears on **every** day it covers, and one day view gathers that day's agenda, tasks and note together.

## AI assistant

A panel that opens from the top bar on any page — not a route, because it is an assistant rather than a destination.

**You bring your own key.** Yours is validated against the provider before it is stored, encrypted at rest, and only ever shown back to you masked. A rejected key tells you to re-enter your key rather than reporting an invalid request.

## Chat

One-to-one messaging with your team at **Chat**, authenticated at the connection and scoped to the two participants.

**Messages are relayed and never stored.** Every thread is labelled *not saved*, and reloading starts an empty one. That is a decision, not a missing feature — see the note in the product documentation.

## Documentation

The pages you are reading. Admins write them at **Administration → Documentation**: create, edit, reorder, publish, unpublish and delete, with drafts invisible to the public route until published.

## Administration

- **Users** — roles and activation. Demoting or deactivating someone ends their sessions immediately rather than waiting for a token to expire.
- **Console monitor** — point it at a running URL and watch that browser's console live, one session per URL, admin only.

## Roles

| Role {w-32} | Scope |
| --- | --- |
| **Owner** | The project. Archive, restore, transfer ownership |
| **Admin** | Project settings, the ingest key, membership |
| **Member** | Read the project, work its issues and tickets |

Permission is re-read from the database on **every** request, so a change takes effect on the next click rather than when a token happens to expire.

## Not in the product

Stated so nobody plans around them:

- **No invoicing or billing.** There is no such model and no such route.
- **No chat history.** Decided, not pending.
- **No real-time on the ticket board.** Only the issue list streams.
