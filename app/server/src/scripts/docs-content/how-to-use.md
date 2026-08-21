The whole loop, once: install the snippet, watch an error arrive, decide what to do about it, and plan the work that comes out of it.

## 1. Make a project

**Projects** in the sidebar, then **New project**. A project is the unit everything else hangs off: it owns an ingest key, the levels you capture, the origins allowed to report, how long raw events are kept, and who can see any of it.

You are its **owner**. That matters later — an owner can archive, restore and hand the project to someone else, and an admin cannot.

## 2. Install the snippet

Open **Settings** on the project and copy the script tag. It carries the project's ingest key, which is public on purpose: it can write events into that one project and can never read anything back.

```html
<script src="https://your-apexops-host/sdk/v1.js" data-key="pk_..." defer></script>
```

That is the whole install. The SDK captures uncaught errors and unhandled promise rejections, batches them, and posts them to a single endpoint.

:::callout{title="Nothing arriving?"}
Check the project's **allowed origins**. Leave the list empty while you are setting up — an allowlist with the wrong host in it refuses every event, and the refusal is deliberately quiet on the page being monitored.
:::

## 3. Watch the first error land

Throw something on purpose:

```js
setTimeout(() => { throw new Error('ApexOps smoke test'); });
```

Open the project's **Issues** tab. It appears within a couple of seconds, and it appears **without a refresh** — the list holds a live connection and patches itself. The badge above the list tells you the truth about that connection: *live*, *reconnecting*, or *offline*. It will never claim *live* over a dead feed, which is the whole reason it has three states instead of a checkbox.

## 4. Read what actually happened

Click the issue. What you get:

| On the page {w-56} | What it is for |
| --- | --- |
| **Count and last seen** | One row per distinct error, however many times it fired |
| **Stack, symbolicated** | Original file and line, if you uploaded a source map for that release |
| **Timeline** | When it fired, so you can line it up against a deploy |
| **Browsers, OS, releases** | Whether it is everyone or just one old Safari |

Identical errors collapse into **one issue** by fingerprint. A thousand occurrences is one row with a count of 1,000 — not a thousand rows.

## 5. Decide

Three answers, and they are different on purpose:

- **Resolved** — you fixed it. If it happens again it comes back as a **regression**, moves back to unresolved, and notifies. Resolving is not silencing.
- **Ignored** — you know, and you do not want to be told. A regression does **not** override this; it is you asking for quiet.
- **Promote to ticket** — it is real work. This is the next step.

## 6. Turn it into work

**Create ticket** on the issue makes a ticket on that project's board, carrying the culprit, the count, when it was first seen and the latest stack into the description. The two rows stay linked, so the ticket knows where it came from and the issue knows it has been picked up.

Promote the same issue twice and you get the ticket that already exists rather than a duplicate.

From there the board is ordinary: status, priority, assignee, tags, comments. Deleting a ticket **archives** it; it can be restored.

## 7. Plan around it

The rest of the workspace is for the work that is not a ticket:

- **Tasks** — everything you have planned, across every day. *Overdue* means a deadline that has passed on unfinished work, not merely something planned for an earlier day.
- **Notes & Calendar** — one set of notes, two views. A note can be scheduled onto a future day, which is what makes the calendar a plan rather than a diary.
- **Chat** — a side channel for the team. Messages are relayed and never stored; every thread says so.

## 8. Bring the team in

**Members** on the project, then invite by email. Three roles:

| Role {w-32} | Can |
| --- | --- |
| **Owner** | Everything, including archive, restore and transfer |
| **Admin** | Settings, the ingest key, and membership |
| **Member** | Read the project and work its issues and tickets |

A project you are not a member of answers **404**, not *403* — a "forbidden" would confirm the project exists, which is a way to go fishing for other people's project names.

## Where to go next

- [Quickstart](/docs/quickstart) — the two-minute version of steps 2 and 3.
- [Browser SDK](/docs/sdk) — configuration, capture behaviour, payload limits.
- [Grouping & retention](/docs/grouping) — how events collapse, and how long they are kept.
- [Projects & roles](/docs/projects-and-roles) — archiving versus deleting, and who holds what.
