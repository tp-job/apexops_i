# Project Structure

> Rewritten 2026-07-24. The previous version showed `client/` + `server/` at the repo root — the
> actual repo moved both under `app/` a while ago, with Prisma kept out-of-tree. See memory
> `repo-layout-workspaces` / `context/devrule.md` §1 for the authoritative version of this.

```
apexops_i/
├── app/
│   ├── client/                     # React 19 + Vite + TS frontend
│   │   └── src/
│   │       ├── App.tsx, main.tsx
│   │       ├── api/                # api client + config (base URL, auth headers)
│   │       ├── components/
│   │       │   ├── common/         # ErrorBoundary, layout/ (PageHeader, GlassPanel, KpiCard, PillTabs)
│   │       │   └── design-system/  # Luxe v2 primitives — Surface, StatTile, Timeline, Stepper, etc.
│   │       ├── context/            # Auth, Theme, Toast providers
│   │       ├── hooks/              # useBugTrackerData/-Socket, useCalendarEvents,
│   │       │                       #   useOptimizationCalendarEvents, useNoteList,
│   │       │                       #   useNoteStatsOverview, useNoteAiChat
│   │       ├── lib/                # motion.ts (animation vocabulary), utils.ts (cn helper)
│   │       ├── pages/              # currently: DesignSystem.tsx only (see UI reset doc)
│   │       ├── routes/             # AppRoutes.tsx — /design-system + catch-all redirect
│   │       ├── services/           # api.ts (axios), auth.ts
│   │       ├── types/, utils/      # shared types + offlineMock/mockData/calendar helpers
│   │       └── styles/             # globals.css, scrollbar.css, responsive.css, components/*.css
│   └── server/                     # Express 5 + Prisma backend
│       └── src/
│           ├── server.ts
│           ├── api/                # auth, tickets, logs, notes, chat, ai, console-logs, console-monitor
│           ├── middleware/         # auth, rateLimit, validate
│           ├── schemas/            # Zod schemas per resource
│           ├── lib/prisma.ts       # Prisma client singleton
│           └── utils/chat.ts
├── database/
│   └── prisma/
│       └── schema.prisma           # User, UserSettings, Ticket, Log, Note, RefreshToken
├── .agents/                        # this documentation tree — context/, design-system/, docs/, template/
└── package.json                    # npm workspaces: ["app/client", "app/server"]
```

## Key points

- **`app/client` and `app/server` are npm workspaces**, not independent projects at the repo root.
- **Prisma is deliberately out-of-tree** at `database/prisma`, not under `app/server` — the server
  resolves it via a `prisma.schema` path in its own `package.json`. Do not move it back under
  `app/server` without checking `devrule.md` §1's rationale (Prisma 6 EA config-file caveat).
- **`app/client/src/pages/` currently has one file** — `DesignSystem.tsx`. Every other page was
  removed in the 2026-07-24 reset; see `frontend/ui-reset-2026-07-24.md` for the full list of what
  was deleted vs kept, and `frontend/user-flow.md` for what gets rebuilt and in what order.
- **`components/ui/<feature>/` folders no longer exist** except `components/ui/note/utils/` (kept
  because two preserved hooks import from it directly — an exception to the "components/ui = UI,
  gets deleted" pattern, worth knowing before assuming a `components/ui/*` folder is safe to remove).
