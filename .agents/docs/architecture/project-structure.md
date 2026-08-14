# Project Structure

> Rewritten 2026-08-15 during a structural cleanup. The previous version still described the
> 2026-07-24 UI-reset snapshot — it claimed `pages/` held a single file (`DesignSystem.tsx`) when
> the tree has 21, and it documented folders that no longer exist. Treat the tree below as
> measured, not aspirational; it was generated from the repo on that date.

```
apexops_i/
├── app/
│   ├── client/                     # React 19 + Vite + TS frontend
│   │   └── src/
│   │       ├── App.tsx, main.tsx
│   │       ├── api/                # transport only — fetchWithAuth, request helper, config
│   │       ├── components/
│   │       │   ├── auth/           # route guards
│   │       │   ├── charts/         # hand-rolled SVG charts (no chart library)
│   │       │   ├── common/         # ErrorBoundary, AdminRefusal, StackPanel, alert/
│   │       │   ├── design-system/  # Luxe v2 primitives — the ONE door (30 files)
│   │       │   ├── docs/           # Markdown renderer + docs chrome
│   │       │   └── layout/         # app chrome: AppLayout, Sidebar, Topbar, ProjectTabs, …
│   │       ├── context/            # Auth, Theme, Toast providers
│   │       ├── dev/                # dev-only helpers (role switcher) — never imported in prod paths
│   │       ├── hooks/              # data + state hooks (15)
│   │       ├── lib/                # stateful machinery — authSession, consoleBuffer, docsMarkdown, motion
│   │       ├── pages/              # 21 route components
│   │       ├── routes/             # AppRoutes.tsx
│   │       ├── services/           # everything that talks to the network, one module per domain
│   │       ├── styles/             # globals.css, scrollbar.css, responsive.css, components/*.css
│   │       ├── types/              # shared types, one module per domain
│   │       └── utils/              # pure helpers — format, error, validators, timezones
│   └── server/                     # Express 5 + Prisma backend
│       └── src/
│           ├── server.ts
│           ├── api/                # one router per resource
│           ├── middleware/         # auth, rateLimit, validate
│           ├── schemas/            # Zod schemas per resource
│           ├── lib/                # prisma singleton, eventAnalytics, sessions, sourcemaps, …
│           ├── scripts/            # npm-script entrypoints (seed, backfill, prune, verify)
│           └── utils/
├── database/
│   └── prisma/schema.prisma        # kept deliberately out-of-tree
├── reports/                        # dated written reports
├── .agents/                        # this documentation tree
└── package.json                    # npm workspaces: ["app/client", "app/server"]
```

## Where does this file go?

The three client folders that get confused with each other. The rule is **what the module
does**, not what feature it belongs to:

| Folder | Rule | Examples |
| --- | --- | --- |
| `services/` | **Anything that talks to the network.** One module per domain. | `projects.ts`, `notes.ts`, `calendar.ts`, `chat.ts` |
| `lib/` | **Stateful machinery and coordinators** — things that hold state, own a lifecycle, or encode a subsystem. | `authSession.ts` (the single refresh coordinator), `consoleBuffer.ts`, `docsMarkdown.ts`, `motion.ts` |
| `utils/` | **Pure, dependency-free helpers.** Given the same input, always the same output. | `format.ts`, `error.ts`, `validators.ts`, `timezones.ts` |

The failure this rule prevents is real and happened twice: `calendarApi.ts` and `chatApi.ts` were
network modules living in `utils/`, so a reader looking for the calendar's data source had no
reason to open `utils/`. Both moved to `services/` on 2026-08-15.

Tests live **beside their source** (`lib/consoleBuffer.test.ts`), not in a parallel tree.

## Key points

- **`app/client` and `app/server` are npm workspaces**, not independent projects at the repo root.
- **Prisma is deliberately out-of-tree** at `database/prisma`, not under `app/server` — the server
  resolves it via a `prisma.schema` path in its own `package.json`. Do not move it back without
  checking `devrule.md` §1's rationale (Prisma 6 EA config-file caveat).
- **`components/design-system/` is the one door.** Import primitives from the barrel
  (`@/components/design-system`), never from a component file directly. Until 2026-08-15 the four
  page-layout primitives (`PageHeader`, `GlassPanel`, `KpiCard`, `PillTabs`) lived in
  `components/common/layout/` and were *re-exported* from the barrel, so 17 files imported
  `PageHeader` through the design system and 14 reached past it. Same component, two paths. They
  now live in `design-system/` proper and the second path is gone.
- **`components/` holds components.** `components/ui/note/utils/` used to hold an API client and
  its types — no components at all, three levels inside `components/`. It became `services/notes.ts`
  and `types/notes.ts`, matching how every other domain is arranged. `components/ui/` no longer exists.
- **App chrome is one folder**, `components/layout/` (singular). It was previously split across
  `layouts/`, `components/layouts/` and `components/common/layout/` — but that last one was
  design-system primitives, not chrome, which is why the fix split by *kind* rather than merging
  all three.
- **Two HTTP transports still exist.** See [`data-fetching.md`](data-fetching.md) — `services/api.ts`
  is the last module on axios; everything else uses `fetchWithAuth`.
