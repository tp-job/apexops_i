# Dev Rules — Full Stack Reference
> React 19 · TypeScript · Tailwind CSS v4 · Vite · Express 5 · Prisma · PostgreSQL  
> Covers the full development lifecycle: setup → code → test → deploy  
> These rules are prescriptive. Follow them without exception.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Environment Setup](#2-environment-setup)
3. [TypeScript](#3-typescript)
4. [Backend — Express 5 + Prisma](#4-backend--express-5--prisma)
5. [Database — PostgreSQL + Prisma](#5-database--postgresql--prisma)
6. [Authentication — JWT + BcryptJS](#6-authentication--jwt--bcryptjs)
7. [Security Layer](#7-security-layer)
8. [Real-time — Socket.io](#8-real-time--socketio)
9. [AI Integration — Google Gemini](#9-ai-integration--google-gemini)
10. [Frontend — React 19 + Vite + React Router](#10-frontend--react-19--vite--react-router)
11. [Styling — Tailwind CSS v4 + MUI](#11-styling--tailwind-css-v4--mui)
12. [Data Fetching — Axios + React Query](#12-data-fetching--axios--react-query)
13. [Forms & Validation — Zod](#13-forms--validation--zod)
14. [Rich Text — Tiptap](#14-rich-text--tiptap)
15. [Charts — Recharts](#15-charts--recharts)
16. [Data Display — React Virtuoso](#16-data-display--react-virtuoso)
17. [Date & Time — Dayjs](#17-date--time--dayjs)
18. [Financial Display Rules](#18-financial-display-rules)
19. [Naming Conventions](#19-naming-conventions)
20. [Git & Workflow](#20-git--workflow)
21. [Pre-commit Checklist](#21-pre-commit-checklist)

---

## 1. Project Structure

```
root/
├── client/                        # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── app/                   # Root providers, router setup
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── ui/                # Design-system primitives (zero business logic)
│   │   │   ├── layout/            # Shell, Header, Sidebar, PageWrapper
│   │   │   └── features/          # Feature-scoped components
│   │   │       ├── invoices/
│   │   │       ├── dashboard/
│   │   │       └── editor/
│   │   ├── hooks/                 # Custom React hooks only
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios instance + interceptors
│   │   │   ├── cn.ts              # clsx + tailwind-merge helper
│   │   │   ├── format.ts          # formatUSD, formatDate, etc.
│   │   │   └── socket.ts          # Socket.io client singleton
│   │   ├── pages/                 # Route-level page components
│   │   ├── stores/                # Zustand or Context stores
│   │   ├── types/                 # Shared frontend TypeScript types
│   │   ├── styles/
│   │   │   └── globals.css        # Glass surfaces, font-numbers, scrollbar
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── server/                        # Express 5 + Prisma backend
│   ├── src/
│   │   ├── app.ts                 # Express app factory (no listen here)
│   │   ├── server.ts              # Entry: http.createServer + Socket.io + listen
│   │   ├── routes/                # Route files — thin, no logic
│   │   │   ├── index.ts           # Mount all routers
│   │   │   ├── auth.routes.ts
│   │   │   └── invoices.routes.ts
│   │   ├── controllers/           # Request/response handlers only
│   │   ├── services/              # Business logic — no req/res objects
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── schemas/               # Zod schemas for validation
│   │   ├── lib/
│   │   │   ├── prisma.ts          # Prisma client singleton
│   │   │   ├── env.ts             # Validated env vars
│   │   │   ├── jwt.ts             # JWT sign/verify helpers
│   │   │   └── socket.ts          # Socket.io server instance
│   │   └── types/
│   │       ├── express.d.ts       # Express Request augmentation
│   │       └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                        # Types shared between client and server
│   └── types/
│       ├── invoice.ts
│       └── user.ts
│
└── .env                           # Root env (never commit)
```

**Hard rules:**
- `components/ui/` — zero API calls, zero stores, zero business logic
- `services/` on server — never import `req`, `res`, `next`; pure business logic only
- `controllers/` — never contain business logic; only call service + return response
- `shared/types/` — the only place where client and server types are coupled

---

## 2. Environment Setup

### First-time Setup

```bash
# Clone and install
git clone <repo>
cd root

# Backend
cd server && npm install
cp .env.example .env           # Fill all required values
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Run migrations
npm run dev                    # ts-node-dev, port 4000

# Frontend (new terminal)
cd client && npm install
npm run dev                    # Vite dev server, port 5173
```

### Environment Validation — server/src/lib/env.ts

```ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:            z.enum(['development', 'test', 'production']),
  PORT:                z.coerce.number().default(4000),
  DATABASE_URL:        z.string().url(),
  JWT_SECRET:          z.string().min(32),
  JWT_REFRESH_SECRET:  z.string().min(32),
  JWT_EXPIRES_IN:      z.string().default('15m'),
  CORS_ORIGIN:         z.string().url(),
  GOOGLE_AI_API_KEY:   z.string().min(1),
  RATE_LIMIT_WINDOW:   z.coerce.number().default(15),
  RATE_LIMIT_MAX:      z.coerce.number().default(100),
})

export const env = envSchema.parse(process.env)
```

**Rules:**
- Never `process.env.FOO` anywhere in application code — always `import { env } from '@/lib/env'`
- App crashes at startup if any required env var is missing — this is intentional
- Client uses `import.meta.env.VITE_*` — prefix all public client vars with `VITE_`
- Never put secrets in `VITE_*` vars — they are bundled into client JS

### .env.example (commit this, not .env)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=change_this_to_a_random_32_char_string_minimum
JWT_REFRESH_SECRET=change_this_to_another_random_32_char_string
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:5173
GOOGLE_AI_API_KEY=your_google_ai_key_here
```

---

## 3. TypeScript

### tsconfig.json (both client and server)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

All flags must be `true`. No `// @ts-ignore` without a comment explaining why.

### Type Rules

```ts
// ✅ Interface for object shapes
interface Invoice {
  id:         string
  amount:     number
  status:     InvoiceStatus
  dueDate:    Date
  customerId: string
  createdAt:  Date
}

// ✅ Union for finite sets
type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue' | 'unsent' | 'viewed'

// ✅ Type for computed/utility shapes
type CreateInvoicePayload = Omit<Invoice, 'id' | 'createdAt'>
type InvoiceWithCustomer  = Invoice & { customer: Customer }

// ✅ Generic when the shape is truly reusable
interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

// ❌ Never use `any`
// ❌ Never use `as Foo` assertion without a type guard above it
// ❌ Never use `!` non-null assertion without a null check above it
```

### Consistent Type Imports

```ts
// ✅ Always use `import type` for type-only imports
import type { Invoice, InvoiceStatus } from '@shared/types/invoice'
```

---

## 4. Backend — Express 5 + Prisma

### App Factory Pattern

```ts
// server/src/app.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { env } from './lib/env'
import { apiRouter } from './routes'
import { errorMiddleware } from './middleware/error.middleware'

export function createApp() {
  const app = express()

  // Security first — order matters
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
    max:      env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders:   false,
  }))

  // Parsers after security
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Routes
  app.use('/api/v1', apiRouter)

  // Error handler — must be last
  app.use(errorMiddleware)

  return app
}
```

```ts
// server/src/server.ts
import http from 'http'
import { createApp } from './app'
import { initSocket } from './lib/socket'
import { env } from './lib/env'

const app    = createApp()
const server = http.createServer(app)
initSocket(server)

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})
```

### Route → Controller → Service Pattern

```ts
// routes/invoices.routes.ts — thin, no logic
import { Router } from 'express'
import { InvoiceController } from '../controllers/invoice.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createInvoiceSchema, listInvoicesSchema } from '../schemas/invoice.schema'

const router = Router()

router.use(authenticate)
router.get('/',    validate('query', listInvoicesSchema),   InvoiceController.list)
router.get('/:id',                                          InvoiceController.getById)
router.post('/',   validate('body',  createInvoiceSchema),  InvoiceController.create)
router.patch('/:id',                                        InvoiceController.update)
router.delete('/:id',                                       InvoiceController.remove)

export { router as invoiceRouter }
```

```ts
// controllers/invoice.controller.ts — req/res only, calls service
import type { Request, Response, NextFunction } from 'express'
import { InvoiceService } from '../services/invoice.service'

export const InvoiceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InvoiceService.list(req.query, req.user!.id)
      res.json({ data: result.items, meta: result.meta })
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await InvoiceService.getById(req.params.id, req.user!.id)
      res.json({ data: invoice })
    } catch (err) { next(err) }
  },
}
```

```ts
// services/invoice.service.ts — business logic only, no req/res
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'

export const InvoiceService = {
  async list(filters: InvoiceFilters, userId: string) {
    const { page = 1, pageSize = 20, status } = filters
    const where = { userId, ...(status ? { status } : {}) }

    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.invoice.count({ where }),
    ])

    return { items, meta: { total, page, pageSize } }
  },

  async getById(id: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice)                    throw new AppError(404, 'NOT_FOUND', 'Invoice not found')
    if (invoice.userId !== userId)   throw new AppError(403, 'FORBIDDEN', 'Access denied')
    return invoice
  },
}
```

### Error Handling

```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// middleware/error.middleware.ts
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors'
import { ZodError } from 'zod'

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      code:    'VALIDATION_ERROR',
      message: 'Invalid input',
      details: err.flatten().fieldErrors,
    })
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message })
  }
  console.error('[Unhandled Error]', err)
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' })
}
```

### API Response Envelope

All responses follow this shape — no exceptions:

```ts
// Success — single item
{ data: Invoice }

// Success — list
{ data: Invoice[], meta: { total: number; page: number; pageSize: number } }

// Error
{ code: string; message: string; details?: Record<string, string[]> }
```

---

## 5. Database — PostgreSQL + Prisma

### Prisma Client Singleton

```ts
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Never `new PrismaClient()` anywhere else. Always import `prisma` from `lib/prisma`.

### Schema Conventions

```prisma
model Invoice {
  id         String        @id @default(cuid())      // cuid not uuid
  amount     Decimal       @db.Decimal(12, 2)        // Decimal for money — never Float
  status     InvoiceStatus @default(DRAFT)
  dueDate    DateTime
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  userId     String
  user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([dueDate])
  @@map("invoices")                                   // snake_case table names
}

enum InvoiceStatus { DRAFT UNPAID PAID OVERDUE }
```

**Rules:**
- Always `Decimal` for monetary values — never `Float`
- Always add `@@index` for foreign keys and filtered columns
- Table names `@@map` to snake_case; model names stay PascalCase
- Always include `createdAt` and `updatedAt`
- Use `cuid()` as default ID — sortable and URL-safe

### Migration Workflow

```bash
npx prisma migrate dev --name describe_change_here   # dev: create + apply
npx prisma migrate deploy                            # prod: apply only
npx prisma generate                                  # after schema change
npx prisma studio                                    # inspect data
```

Never edit migration files by hand. If a migration is wrong, create a new corrective one.

---

## 6. Authentication — JWT + BcryptJS

```ts
// lib/jwt.ts
import jwt from 'jsonwebtoken'
import { env } from './env'

export interface TokenPayload { userId: string; email: string }

export const signAccess    = (p: TokenPayload) => jwt.sign(p, env.JWT_SECRET,         { expiresIn: env.JWT_EXPIRES_IN as string })
export const signRefresh   = (p: TokenPayload) => jwt.sign(p, env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
export const verifyAccess  = (t: string) => jwt.verify(t, env.JWT_SECRET)         as TokenPayload
export const verifyRefresh = (t: string) => jwt.verify(t, env.JWT_REFRESH_SECRET) as TokenPayload
```

```ts
// services/auth.service.ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12   // never below 10

export const AuthService = {
  hashPassword:   (plain: string)            => bcrypt.hash(plain, SALT_ROUNDS),
  verifyPassword: (plain: string, hashed: string) => bcrypt.compare(plain, hashed),
}
```

```ts
// middleware/auth.middleware.ts
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHORIZED', 'No token')
  try {
    req.user = verifyAccess(header.slice(7))
    next()
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Invalid or expired token')
  }
}
```

```ts
// types/express.d.ts — augment Request with user
import type { TokenPayload } from '../lib/jwt'
declare global {
  namespace Express {
    interface Request { user?: TokenPayload }
  }
}
```

**Rules:**
- Access tokens: short-lived (`15m`), sent in `Authorization: Bearer` header only
- Refresh tokens: long-lived (`7d`), stored in `httpOnly` cookie only
- Never store tokens in `localStorage` — XSS exposure
- Passwords: `bcryptjs`, `SALT_ROUNDS = 12`, never logged or returned

---

## 7. Security Layer

```ts
// Applied in app.ts in this exact order:
app.use(helmet())                              // 1. HTTP security headers
app.use(cors({ origin: env.CORS_ORIGIN }))    // 2. CORS whitelist
app.use(rateLimit({ ... }))                   // 3. Rate limiting
app.use(express.json({ limit: '10mb' }))      // 4. Body parsing — after security
```

```ts
// Tighter limits on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 'RATE_LIMITED', message: 'Too many attempts' },
})

router.post('/auth/login',    authLimiter, AuthController.login)
router.post('/auth/register', authLimiter, AuthController.register)
```

Do not disable helmet defaults without documenting why.

---

## 8. Real-time — Socket.io

### Server

```ts
// lib/socket.ts
import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyAccess } from './jwt'
import { env } from './env'

let io: Server

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    connectionStateRecovery: {},
  })

  // Auth every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.data.user = verifyAccess(token)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { userId } = socket.data.user
    socket.join(`user:${userId}`)
    socket.on('disconnect', () => socket.leave(`user:${userId}`))
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
```

```ts
// Emit from a service — after business logic completes
import { getIO } from '../lib/socket'
getIO().to(`user:${userId}`).emit('invoice:updated', { id, status })
```

### Client

```ts
// lib/socket.ts
import { io } from 'socket.io-client'

let socket: ReturnType<typeof io> | null = null

export function getSocket(token: string) {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL, { auth: { token }, autoConnect: false })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
```

```tsx
// Usage hook
function useInvoiceUpdates(onUpdate: (data: unknown) => void) {
  useEffect(() => {
    const socket = getSocket(getAccessToken())
    socket.connect()
    socket.on('invoice:updated', onUpdate)
    return () => {
      socket.off('invoice:updated', onUpdate)
      socket.disconnect()
    }
  }, [onUpdate])
}
```

---

## 9. AI Integration — Google Gemini

```ts
// services/ai.service.ts
import { GoogleGenerativeAI } from '@google/genai'
import { env } from '../lib/env'

const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY)

export const AIService = {
  async generateInvoiceSummary(invoiceData: unknown): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `
      Summarize this invoice data in 2 sentences for a finance dashboard.
      Be concise. Output plain text only.
      Data: ${JSON.stringify(invoiceData)}
    `
    const result = await model.generateContent(prompt)
    return result.response.text()
  },
}
```

**Rules:**
- AI calls always live in `services/` — never in controllers or routes
- Always set an explicit model string — never rely on a default
- Wrap AI calls in try/catch — AI errors must never crash the request
- Never send raw user input to the AI — sanitize and structure it first
- If you expect JSON from the AI response, parse and validate with Zod before using

---

## 10. Frontend — React 19 + Vite + React Router

### Vite Config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
})
```

### Router Setup

```tsx
// app/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import { AppShell }      from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardPage }  from '@/pages/DashboardPage'
import { InvoicesPage }   from '@/pages/InvoicesPage'
import { LoginPage }      from '@/pages/LoginPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { path: '/',           element: <DashboardPage /> },
        { path: '/invoices',   element: <InvoicesPage /> },
        { path: '/invoices/:id', element: <InvoicePage /> },
      ],
    }],
  },
])
```

### Component Rules

```tsx
// ✅ Named export, explicit Props interface, no business logic in ui/
interface KPICardProps {
  label: string
  value: number
  unit?: 'currency' | 'days' | 'count'
}

export function KPICard({ label, value, unit = 'currency' }: KPICardProps) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        {unit === 'currency' && <span className="text-gray-400 text-lg">$</span>}
        <h2 className="text-3xl font-bold font-numbers text-brand-dark">
          {unit === 'currency' ? formatUSD(value) : value}
        </h2>
        {unit === 'days' && <span className="text-gray-400">days</span>}
      </div>
    </div>
  )
}

// ❌ No default exports for components (pages only)
// ❌ No anonymous arrow components
// ❌ No business logic in ui/ components
```

---

## 11. Styling — Tailwind CSS v4 + MUI

### cn() Helper

```ts
// lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

### Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"DM Sans"',        'sans-serif'],
        body:    ['"Inter"',          'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          accent: '#C5F43A',
          dark:   '#222222',
          gray:   '#F3F4F6',
        },
      },
    },
  },
} satisfies Config
```

### MUI + Tailwind Coexistence Rules

```tsx
// ✅ Tailwind for layout, spacing, colors on custom components
<div className="glass-panel rounded-3xl p-6 flex items-center gap-4">

// ✅ MUI for complex interactive widgets only
//    (DataGrid, DatePicker, Autocomplete, Dialog)
import { Dialog, DialogContent } from '@mui/material'

// ✅ Override MUI via sx prop — never global CSS overrides
<Button sx={{ borderRadius: '12px', textTransform: 'none' }}>Save</Button>

// ❌ Never mix MUI makeStyles/styled() with Tailwind on the same element
// ❌ Never use MUI for layout, spacing, or typography that Tailwind handles
```

### Conditional Classes — always cn()

```tsx
// ✅
className={cn(
  'flex items-center p-3 rounded-2xl transition cursor-pointer',
  isActive
    ? 'bg-white/10 border border-white/20 shadow-lg'
    : 'border border-transparent hover:bg-white/5 hover:border-white/10',
)}

// ❌ Never string-interpolate Tailwind classes
className={`bg-${color}-500`}   // purger cannot find this
```

---

## 12. Data Fetching — Axios + React Query

### Axios Instance

```ts
// lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL + '/api/v1',
  withCredentials: true,
  timeout:         15_000,
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        await refreshTokens()
        return api(original)
      } catch {
        clearSession()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
```

### React Query Setup

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### Query & Mutation Pattern

```ts
// hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Typed key factory — always
export const invoiceKeys = {
  all:    ()                   => ['invoices']               as const,
  list:   (f: InvoiceFilters)  => ['invoices', 'list', f]   as const,
  detail: (id: string)         => ['invoices', 'detail', id] as const,
}

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn:  () => api.get<{ data: Invoice[] }>('/invoices', { params: filters }).then(r => r.data.data),
    staleTime: 30_000,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      api.post<{ data: Invoice }>('/invoices', payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all() }),
  })
}
```

**Rules:**
- Query keys always use typed factory functions (`invoiceKeys.*`)
- `staleTime` is always explicit — never rely on the `0` default
- Mutations always invalidate or update cache on success
- Never store server state in `useState`
- Never `useEffect` + `fetch` for server data

---

## 13. Forms & Validation — Zod

### Schema-first — define once, reuse on both sides

```ts
// shared/schemas/invoice.ts
import { z } from 'zod'

export const createInvoiceSchema = z.object({
  amount:     z.number().positive('Amount must be positive'),
  dueDate:    z.string().datetime('Invalid date format'),
  customerId: z.string().cuid('Invalid customer ID'),
  lineItems:  z.array(z.object({
    label:  z.string().min(1),
    amount: z.number().positive(),
  })).min(1, 'At least one line item required'),
})

export type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>
```

### Validate Middleware (Server)

```ts
// middleware/validate.middleware.ts
import type { ZodSchema } from 'zod'

export function validate(target: 'body' | 'query' | 'params', schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target])
    if (!result.success) return next(result.error)  // ZodError → error middleware
    req[target] = result.data
    next()
  }
}
```

### React Hook Form + Zod (Client)

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createInvoiceSchema, type CreateInvoicePayload } from '@shared/schemas/invoice'

function CreateInvoiceForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateInvoicePayload>({
    resolver: zodResolver(createInvoiceSchema),
  })
  const { mutate, isPending } = useCreateInvoice()

  return (
    <form onSubmit={handleSubmit((data) => mutate(data))}>
      <input {...register('customerId')} />
      {errors.customerId && <p className="text-red-400 text-xs">{errors.customerId.message}</p>}
      <button type="submit" disabled={isPending}>Create</button>
    </form>
  )
}
```

---

## 14. Rich Text — Tiptap

```tsx
// components/features/editor/RichTextEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit  from '@tiptap/starter-kit'
import Table       from '@tiptap/extension-table'
import TableRow    from '@tiptap/extension-table-row'
import TableCell   from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image       from '@tiptap/extension-image'
import Link        from '@tiptap/extension-link'
import TextAlign   from '@tiptap/extension-text-align'
import Color       from '@tiptap/extension-color'
import Highlight   from '@tiptap/extension-highlight'

interface RichTextEditorProps {
  content:   string
  onChange:  (html: string) => void
  readOnly?: boolean
}

export function RichTextEditor({ content, onChange, readOnly = false }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Image.configure({ allowBase64: false }),     // Never base64 — use upload URLs
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color, Highlight,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return <EditorContent editor={editor} className="prose max-w-none" />
}
```

**Rules:**
- Never allow `base64` images — always upload and use a URL
- Sanitize `getHTML()` output server-side before storing (use `dompurify` or server-side sanitizer)
- `dangerouslySetInnerHTML` only after sanitization

---

## 15. Charts — Recharts

```tsx
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { formatUSD } from '@/lib/format'

export function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#C5F43A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#C5F43A" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Inter' }} />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
               tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
        <Tooltip formatter={(v: number) => formatUSD(v)} />
        <Area type="monotone" dataKey="amount"
          stroke="#C5F43A" strokeWidth={2} fill="url(#revenueGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

**Rules:**
- Always wrap in `ResponsiveContainer` — never hardcode pixel dimensions
- Y-axis and tooltip values always use `formatUSD` from `lib/format`
- Use `brand-accent (#C5F43A)` as the primary series color
- Gradient fills always use the `<defs>` + `linearGradient` pattern above

---

## 16. Data Display — React Virtuoso

Use for any list that may exceed 100 items.

```tsx
import { Virtuoso } from 'react-virtuoso'

export function VirtualInvoiceList({ invoices, selectedId, onSelect }: VirtualInvoiceListProps) {
  return (
    <Virtuoso
      style={{ height: '100%' }}        // Required — Virtuoso needs a bounded height
      data={invoices}
      itemContent={(_, invoice) => (
        <InvoiceRow
          key={invoice.id}
          invoice={invoice}
          isActive={invoice.id === selectedId}
          onSelect={onSelect}
        />
      )}
    />
  )
}
```

**Rules:**
- Always `style={{ height: '100%' }}` — parent must have a fixed/bounded height
- Never use array index as `key` inside `itemContent`
- For infinite scroll: use `endReached` prop to trigger next page load

---

## 17. Date & Time — Dayjs

```ts
// lib/format.ts
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc       from 'dayjs/plugin/utc'
import timezone  from 'dayjs/plugin/timezone'

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

// All dates stored UTC, displayed in user timezone
export const formatDate     = (d: Date | string) => dayjs(d).format('DD MMM YYYY')
export const formatDateTime = (d: Date | string) => dayjs(d).format('DD MMM YYYY, HH:mm')
export const formatRelative = (d: Date | string) => dayjs(d).fromNow()
export const formatDueDate  = (d: Date | string) => {
  const diff = dayjs(d).diff(dayjs(), 'day')
  if (diff < 0)   return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  return `In ${diff} days`
}
```

**Rules:**
- Always use these helpers — never `Date.toLocaleDateString()` inline
- Never format dates directly in JSX
- All dates are stored as UTC in the database

---

## 18. Financial Display Rules

```ts
// lib/format.ts
export function formatUSD(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
```

```tsx
// ✅ Always split symbol and number into separate elements
<div className="flex items-baseline gap-1">
  <span className="text-gray-400 text-lg">$</span>
  <span className="text-3xl font-bold font-numbers text-brand-dark">
    {formatUSD(invoice.amount)}
  </span>
</div>

// ✅ Negative amounts use proper minus sign (U+2212)
<span className="font-numbers text-red-400">−{formatUSD(Math.abs(amount))}</span>

// ❌ Never `$${formatUSD(v)}` — symbol must be a separate element
// ❌ Never Float for money in the database — always Decimal / integer cents
// ❌ Never display raw JS floats
```

---

## 19. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| React component | PascalCase | `InvoiceDetailPane` |
| React hook | `use` + PascalCase | `useInvoiceDetail` |
| TypeScript interface | PascalCase | `Invoice` |
| TypeScript type alias | PascalCase | `InvoiceStatus` |
| Prisma model | PascalCase | `Invoice` |
| DB table (`@@map`) | snake_case | `invoices` |
| DB column (`@map`) | snake_case | `due_date` |
| Constant | SCREAMING_SNAKE | `MAX_PAGE_SIZE` |
| Variable / function | camelCase | `selectedInvoice` |
| File — component | PascalCase | `InvoiceRow.tsx` |
| File — util/hook | camelCase | `useInvoices.ts` |
| File — route/schema | kebab-case | `invoice.routes.ts` |
| CSS class | kebab-case | `glass-panel` |
| Env variable | SCREAMING_SNAKE | `JWT_SECRET` |
| Socket event | `resource:action` | `invoice:updated` |
| Query key | `['resource', 'type', params]` | `['invoices', 'list', filters]` |
| API route | kebab-case plural | `/api/v1/invoices` |
| Git branch | kebab-case | `feat/invoice-detail` |

---

## 20. Git & Workflow

### Commit Messages — Conventional Commits

```
feat(invoices): add active indicator strip to list item
fix(detail-pane): correct balance-due to use font-numbers
style(nav): align active dot vertically
refactor(hooks): extract useInvoiceDetail from DetailPane
test(invoice-service): add getById not-found assertion
chore(deps): upgrade tailwindcss to v4
docs(dev-rules): add socket.io section
```

### Branch Naming

```
feat/invoice-detail-pane
fix/status-badge-overflow
refactor/auth-middleware
chore/upgrade-react-19
```

### Dev Scripts

```bash
# Server
npm run dev          # ts-node-dev with hot reload
npm run build        # tsc → dist/
npm run start        # node dist/server.js
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
npm run db:reset     # prisma migrate reset (dev only)

# Client
npm run dev          # Vite dev server
npm run build        # vite build
npm run preview      # preview production build
npm run lint         # eslint src/
npm run type-check   # tsc --noEmit
```

### PR Rules
- Description explains *why*, not just *what*
- Screenshots or recordings for any UI change
- No merge with TypeScript errors or ESLint errors
- One concern per PR — keep them small

---

## 21. Pre-commit Checklist

**TypeScript**
- [ ] No `any` types
- [ ] No `// @ts-ignore` without a comment explaining why
- [ ] No `!` non-null assertions without a guard above them
- [ ] All type-only imports use `import type`

**Display**
- [ ] All monetary amounts use `formatUSD()` — no raw numbers
- [ ] All money values rendered as separate `$` span + `font-numbers` number span
- [ ] Negative amounts use `−` (U+2212), not `-` (hyphen)
- [ ] All dates use `formatDate` / `formatRelative` — no inline `Date` methods

**Styling**
- [ ] Conditional classes use `cn()` — no template literal class strings
- [ ] No hardcoded hex colors when a design token exists
- [ ] No glass styles recreated inline — always use `glass-panel` / `glass-dark` / `glass-blue`
- [ ] No inline `style` for anything expressible in Tailwind

**Accessibility**
- [ ] All interactive non-button elements have `role="button"` + keyboard handler
- [ ] All icon-only buttons have `aria-label`
- [ ] All `<img>` have meaningful `alt` text
- [ ] Focus rings not suppressed without a visible replacement

**Backend**
- [ ] No `process.env.FOO` — always `env.FOO` from `lib/env`
- [ ] No secrets in logs
- [ ] All routes have validation middleware
- [ ] All controllers wrap in try/catch and call `next(err)`
- [ ] Monetary DB columns use `Decimal`, not `Float`

**Data**
- [ ] No `useEffect` for server data fetching — use React Query
- [ ] Query keys use `*Keys` factory functions
- [ ] Mutations invalidate relevant cache on success

**Git**
- [ ] Commits follow Conventional Commits format
- [ ] No `.env` files staged
- [ ] `npm run type-check` passes with zero errors
- [ ] `npm run lint` passes with zero errors

---

*End of Dev Rules v2.0*