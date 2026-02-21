# ApexOps

**DevPlatform for authentication, logging, notes, tickets, and real-time collaboration — one place to build, monitor, and ship.**

---

## Project Title & Description

**ApexOps** is a full-stack operations and development platform that gives teams a single place to manage users, application logs, notes, tickets, and real-time features (chat, calendar). It offers an in-app **Documentation** hub, **API Reference**-style docs, and **Analytics** (charts, dashboards) so you can run and observe your product without jumping between tools.

- **Value:** Unified auth, structured logging, real-time APIs (WebSocket/Socket.io), and built-in docs + analytics for faster onboarding and operations.

---

## Tech Stack

| Layer      | Technologies |
|-----------|--------------|
| **Frontend** | React 19, TypeScript, Vite, React Router, Tailwind CSS v4, MUI, TipTap (editor), Recharts, Socket.io-client |
| **Backend**  | Node.js, Express 5, TypeScript, Prisma, PostgreSQL, JWT, Zod, Socket.io, WebSocket (ws) |
| **DevOps**   | Git, npm, Prisma Migrate |

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** v14+
- **npm** (or yarn)

### 1. Clone the repository

```bash
git clone <repository-url>
cd apexops_i
```

### 2. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend (from repo root)
cd ../client
npm install
```

### 3. Environment variables

Create and configure environment for the **server** (no secrets in repo).

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your values. Minimum to run locally:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/apexops_db?schema=public` |
| `PG_*` | Or set `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT` and URL is built for you | — |
| `PORT` | API server port | `3000` |
| `JWT_SECRET` | Min 32 chars, used for access tokens | (strong random string) |
| `JWT_REFRESH_SECRET` | Min 32 chars, used for refresh tokens | (strong random string) |
| `GEMINI_API_KEY` | Optional; for AI features | (from Google AI Studio) |

Then run Prisma migrations and generate client:

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run the app

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:3000  

---

## Key Features

- **Authentication** — Register, login, JWT + refresh tokens, protected routes, account settings.
- **Logging** — Ingest and list application logs; filters and structure for debugging.
- **Notes** — Rich editor (TipTap), real-time updates, sharing.
- **Tickets** — Bug/task tracking with assignees and status.
- **Real-time** — Chat and live updates via WebSocket / Socket.io.
- **Documentation** — In-app docs hub at `/about/docs` with quickstart, API-style docs (e.g. logs, metrics, errors), and AI diagnostics.
- **Analytics & dashboards** — Dashboard with charts (Recharts), log overview, ticket status, note activity, and related metrics.

---

## Security Note

**Do not commit secrets or API keys to the repository.**

- Store all secrets in **environment variables** (e.g. `server/.env`). Use `server/.env.example` as a template; never put real values in `.env.example`.
- **`.gitignore`** is configured to exclude `.env`, `.env.local`, `.env.production`, and similar files so they are never pushed.
- If a key is ever committed (e.g. by mistake, or as in a past Stripe test key in sample code), remove it from the file, amend or rewrite the commit so the secret is no longer in history, then rotate the key. Rely on **push protection** and **secret scanning** (e.g. GitHub) to catch leaks before they go to the remote.

---

## Folder Structure

```
apexops_i/
├── client/                 # Frontend (React + Vite)
│   ├── public/
│   └── src/
│       ├── components/      # Reusable UI (layouts, charts, chat, note, resources)
│       ├── context/        # Auth and global state
│       ├── hooks/
│       ├── layouts/
│       ├── pages/          # Route pages (Dashboard, Chat, Calendar, Note, etc.)
│       ├── routes/         # App routes and ProtectedRoute
│       ├── services/
│       ├── styles/
│       ├── types/
│       └── utils/
├── server/                 # Backend (Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma   # Models: User, Log, Note, Ticket, etc.
│   └── src/
│       ├── api/            # Route handlers (auth, logs, notes, chat, …)
│       ├── lib/            # Prisma client
│       ├── middleware/     # Auth, rate limit, validation
│       ├── schemas/        # Zod schemas
│       ├── server.ts
│       ├── types/
│       └── utils/
└── docs/                   # Project docs (overview, structure, installation, DB)
```

For more detail, see [Project Structure](./docs/project-structure.md) and [Installation](./docs/installation.md).

---

## Further documentation

- [Overview](./docs/overview.md) · [Features](./docs/features.md) · [Tech Stack (detailed)](./docs/tech-stack.md) · [Installation](./docs/installation.md) · [Database Setup](./docs/database/database-setup.md) · [Theme & Style](./docs/theme-style.md) · [Backend](./docs/backend/backend-tech-stack.md) · [Frontend](./docs/frontend/frontend-tech-stack.md)

---

**Last updated:** 2026-02-21
