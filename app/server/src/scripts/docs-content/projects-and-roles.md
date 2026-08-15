A project is the scope for everything the SDK reports. Who can do what, and how to remove one.

## What a project holds

Every issue, event, ticket, source map and member belongs to exactly one project. Nothing is shared between projects, which is why the first step of [Quickstart](/docs/quickstart) is creating one.

The **slug** is derived from the name and appears in every URL for that workspace. Renaming a project does **not** change its slug — existing links and bookmarks keep working.

## Roles

Each member holds one role *in that project*. It is not a global account level: you can own one project and be a member of another.

| Role {w-28} | Can do |
| --- | --- |
| **member** | Read everything; work on issues and tickets. |
| **admin** | Everything a member can, plus rename, project settings, and managing members and invites. |
| **owner** | Everything an admin can, plus rotating the ingest key, archiving, restoring and permanent deletion. |

The action menu on a project card greys out anything your role cannot do, rather than hiding it — so the menu is the same shape for everyone, and it is clear that the limit is permission rather than a missing feature. The server enforces the same rules independently; the greyed-out control is a courtesy, not the boundary.

## The ingest key

The ingest key identifies the project to the SDK. It is **public by design** — it ships inside a script tag on a page you do not control — and **write-only**: it can report events to one project and can never read anything back. Reading always uses your signed-in session.

If a key is being abused, an owner can rotate it from project settings. The old key stops working immediately, so update the snippet wherever it is deployed.

## Archiving versus deleting

These are different actions and only one is reversible.

**Archive** — the project stops accepting events and leaves the project list. **Nothing is deleted.** Issues, tickets, members and the ingest key are all kept. Turn on **Show archived** to see it again, and **Restore project** puts it back exactly as it was. Owner only.

**Delete permanently** — the project and everything reported into it are removed from the database. Owner only, and it appears **only on a project that is already archived**.

:::callout{tone=warn title="Permanent deletion cannot be undone"}
There is no restore, no trash and no backup you can reach from the app. Deleting a project also deletes every event, issue, ticket, source map, member record and pending invite in it.

Because of that it takes three deliberate steps: archive the project, choose **Delete permanently…** from its menu, then type the project's name exactly. The confirmation lists how many events, issues and tickets will go with it — read those numbers before you type.
:::

If what you want is "stop this project without losing the history", archive it. Archiving is the answer nearly every time.

## Leaving instead of deleting

Leaving is not a deletion. Remove yourself from the project's **Members** list and your access goes; the project and its history are untouched for everyone else. Any member can do this — it is the one row on that list a member is allowed to remove.

An owner cannot leave, because a project with no owner would be orphaned. Transfer ownership to someone else first, then leave.
