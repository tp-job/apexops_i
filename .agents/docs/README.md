# ApexOps — documentation

Reorganized 2026-07-27. Folders are named for **what you are trying to do**, not for which layer of
the stack a document happens to describe. The old `backend/` `frontend/` `client/` `database/` split
put the API reference, the API work-log, and a stale test run in the same folder purely because they
were all "backend", which is how three overlapping API documents survived side by side for months.

> **Currency rule.** Every document here states when it was written and what it was checked against.
> If a document disagrees with the code, the code wins — say so by updating the document, not by
> working around it. Anything that is no longer true goes to [`archive/`](archive/README.md) with a
> reason, never quietly deleted.

## Start here

| If you want to… | Read |
|---|---|
| Understand what ApexOps is | [`product/overview.md`](product/overview.md) |
| Know what it can currently do | [`product/features.md`](product/features.md) |
| See how a user moves through it | [`product/user-flow.md`](product/user-flow.md) |
| Run it locally | [`guides/installation.md`](guides/installation.md) |
| Find an endpoint | [`architecture/api-reference.md`](architecture/api-reference.md) |
| Know what is being built next | [`planning/sprint-plan.md`](planning/sprint-plan.md) |

## Folders

### [`product/`](product/) — what the system is
Problem, scope, capability. The layer that changes when the product changes, not when the code does.

- [`overview.md`](product/overview.md) — what ApexOps is and who it is for
- [`features.md`](product/features.md) — capability inventory, mapped to real routes
- [`srs.md`](product/srs.md) — formal requirements specification
- [`user-flow.md`](product/user-flow.md) — page-by-page journey and the rebuild order

### [`architecture/`](architecture/) — how it is built
The shape of the system. Reference material, not narrative.

- [`project-structure.md`](architecture/project-structure.md) — repo layout and workspaces
- [`tech-stack.md`](architecture/tech-stack.md) — stack overview
- [`backend.md`](architecture/backend.md) · [`backend-process.md`](architecture/backend-process.md)
- [`frontend.md`](architecture/frontend.md) · [`frontend-process.md`](architecture/frontend-process.md) · [`data-fetching.md`](architecture/data-fetching.md)
- [`api-reference.md`](architecture/api-reference.md) — **the** endpoint reference
- [`database.md`](architecture/database.md) — schema and setup
- [`security-auth.md`](architecture/security-auth.md) — auth model and security posture
- [`ai-model.md`](architecture/ai-model.md) — AI provider configuration

### [`features/`](features/) — one spec per feature
Scope locks and decision records. Each carries its decisions (`D1`, `D2`, …), its gates, and its
exit notes. **This is the folder to read before touching a feature**, and to update after.

- [`bug-tracker.md`](features/bug-tracker.md) — board, detail, comments *(shipped)*
- [`notes-calendar.md`](features/notes-calendar.md)
- [`chat.md`](features/chat.md)
- [`project-workspaces-and-sdk.md`](features/project-workspaces-and-sdk.md) — embeddable console SDK + per-project workspaces *(G1 shipped, G2 active)*
- [`settings.md`](features/settings.md) — account + function settings *(proposed)*

### [`planning/`](planning/) — what happens next
Sequencing and capacity. Closed sprints move to `archive/`.

- [`development-plan.md`](planning/development-plan.md) — where the project stands, and the order to build in
- [`sprint-plan.md`](planning/sprint-plan.md) — dated sprints, estimates in engineer-days

### [`guides/`](guides/) — how to do a specific thing
Task-shaped, runnable instructions.

- [`installation.md`](guides/installation.md)
- [`postgresql-fix.md`](guides/postgresql-fix.md) · [`psql-connection.md`](guides/psql-connection.md)
- [`theme-style.md`](guides/theme-style.md) · [`icons.md`](guides/icons.md) · [`template-adoption.md`](guides/template-adoption.md)

### [`archive/`](archive/README.md) — historical, not current
Documents that were true once. Kept for the *why*, never cited as the *what*. See the
[archive README](archive/README.md) for what was retired and the evidence for each.

## Related, outside this folder

- [`../context/devrule.md`](../context/devrule.md) — authoritative repo conventions
- [`../design-system/design.md`](../design-system/design.md) — Luxe v2 design system spec

## Conventions

1. **Every document opens with a date and a provenance line** — what it was written against
   (`app/server/src/api/*`, `schema.prisma`, a specific commit). A document with no provenance
   cannot be audited and will drift.
2. **One canonical document per subject.** If two files cover the same ground, one of them is
   retired. Overlap is what produced the three API documents this reorganization collapsed.
3. **Feature decisions live in `features/`, not in sprint plans.** Sprint plans go stale by design;
   decision records should not.
4. **English for new documents.** The existing Thai-language docs are fine and stay; the retired
   Thai and Chinese duplicates were retired for being *duplicates*, not for their language.
