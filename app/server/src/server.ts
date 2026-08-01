import 'dotenv/config';

// Prisma: ensure DATABASE_URL is set from PG_* if not already set (single source for PostgreSQL)
if (!process.env.DATABASE_URL && process.env.PG_USER && process.env.PG_HOST && process.env.PG_DATABASE) {
    const user = encodeURIComponent(process.env.PG_USER);
    const password = encodeURIComponent(process.env.PG_PASSWORD || '');
    const host = process.env.PG_HOST;
    const port = process.env.PG_PORT || '5432';
    const database = process.env.PG_DATABASE;
    process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { ChatMessage } from './utils/chat';
import {
    parseDirectRoom,
    isParticipant,
    sanitizeMessageContent,
    RateLimiter,
} from './utils/chatRoom';
import prisma from './lib/prisma';
import { SECRET_KEY, JWT_ALGORITHM } from './lib/jwtSecrets';
import { scheduleRetentionPrune } from './lib/retention';

// ── Express App ──────────────────────────────────────────────
const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS: allow frontend dev server (Vite 5173) and explicit preflight
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
    origin: corsOrigin.includes(',') ? corsOrigin.split(',').map((o: string) => o.trim()) : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Socket.IO Server ─────────────────────────────────────────
const server = http.createServer();
const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// The native WebSocket relay that used to listen on :8082 was REMOVED (spec D6,
// .agents/docs/features/project-workspaces-and-sdk.md). It accepted unauthenticated
// connections and re-broadcast every target app's console logs to every listener in
// the `monitors` room — a cross-project leak in the one feature whose purpose is
// per-project isolation. Ingest is now HTTP-only via `POST /api/ingest`, which is
// keyed, rate limited and scoped to a single project.

let dbConnected = false;

// ── Socket.IO Events ─────────────────────────────────────────
interface AppInfo {
    socketId: string;
    appName: string;
    url: string;
    connectedAt: string;
}

/** Upper bound on logs relayed per emit — one socket must not flood every monitor. */
const MAX_RELAYED_LOGS = 100;

const connectedClients = {
    monitors: new Set<string>(),
    targetApps: new Map<string, AppInfo>(),
};

// Simple in-memory registry for chat clients (Instagram-style DM demo)
const chatClients = new Map<string, { userId: string }>();

interface SocketUser {
    id: number;
    email: string;
    name: string;
}

/** Sockets that presented a valid token, keyed by socket id. */
const socketUsers = new Map<string, SocketUser>();
const chatLimiters = new Map<string, RateLimiter>();

/**
 * Handshake authentication.
 *
 * Deliberately *optional*: the console-monitor `target-app` clients and
 * `useBugTrackerSocket` connect without a token and must keep working. A token
 * that is present but invalid is rejected outright rather than downgraded to
 * anonymous — that combination is only ever a bug or an attack.
 *
 * Chat handlers below then require `socketUsers` to hold an entry, so the chat
 * surface is authenticated even though the transport is shared.
 */
io.use(async (socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || !token) return next();

    try {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [JWT_ALGORITHM] }) as {
            id: number;
            email: string;
        };
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, firstName: true, lastName: true, email: true },
        });
        if (!user) return next(new Error('Unauthorized'));

        socketUsers.set(socket.id, {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
        });
        return next();
    } catch {
        return next(new Error('Unauthorized'));
    }
});

io.on('connection', (socket) => {
    console.log('👤 User connected via WebSocket:', socket.id);

    socket.on('register', (data: { clientType: string; appName?: string; url?: string; userId?: string }) => {
        if (data.clientType === 'monitor') {
            // AUTHENTICATED ONLY. This room receives every target app's console
            // output, so an anonymous socket joining it is a cross-project leak —
            // the exact defect that got the :8082 native relay deleted (spec D6).
            // It survived here in socket.io form because the handshake auth is
            // optional for the SDK's benefit; the room has to gate itself.
            const user = socketUsers.get(socket.id);
            if (!user) {
                socket.emit('monitor-error', { error: 'Authentication required to monitor' });
                return;
            }
            connectedClients.monitors.add(socket.id);
            socket.join('monitors');
            socket.emit('target-apps-list', Array.from(connectedClients.targetApps.values()));
        } else if (data.clientType === 'target-app') {
            const appInfo: AppInfo = {
                socketId: socket.id, appName: data.appName || 'Unknown',
                url: data.url || 'Unknown', connectedAt: new Date().toISOString(),
            };
            connectedClients.targetApps.set(socket.id, appInfo);
            socket.join('target-apps');
            io.to('monitors').emit('target-app-connected', appInfo);
        } else if (data.clientType === 'chat') {
            // Identity comes from the verified token, never from the payload —
            // `data.userId` is ignored precisely because a client controls it.
            const user = socketUsers.get(socket.id);
            if (!user) {
                socket.emit('chat-error', { error: 'Authentication required for chat' });
                return;
            }
            chatClients.set(socket.id, { userId: String(user.id) });
            chatLimiters.set(socket.id, new RateLimiter(30, 10_000));
            console.log('💬 Chat client registered:', user.id, 'via', socket.id);
        }
    });

    /**
     * Join a direct conversation.
     *
     * The room id encodes its two participants, so membership is verified here
     * rather than assumed. Previously every chat client sat in one global
     * `chat-users` room and the *browser* filtered by roomId — which meant the
     * server had already handed every message to everyone.
     */
    socket.on('chat-join', (data: { roomId?: unknown }) => {
        const user = socketUsers.get(socket.id);
        if (!user) {
            socket.emit('chat-error', { error: 'Authentication required for chat' });
            return;
        }

        const room = parseDirectRoom(data?.roomId);
        if (!room || !isParticipant(room, user.id)) {
            socket.emit('chat-error', { error: 'Not a participant in that conversation' });
            return;
        }

        // One conversation at a time: leaving the others keeps the socket's room
        // set equal to what the user is actually looking at.
        socket.rooms.forEach((r) => {
            if (r !== socket.id && parseDirectRoom(r)) socket.leave(r);
        });
        socket.join(room.id);
    });

    // Real-time chat message relay, scoped to the conversation's participants.
    socket.on('chat-message', (msg: Partial<ChatMessage>) => {
        const user = socketUsers.get(socket.id);
        if (!user) return;

        if (!chatLimiters.get(socket.id)?.allow()) {
            socket.emit('chat-error', { error: 'Slow down' });
            return;
        }

        const room = parseDirectRoom(msg?.roomId);
        if (!room || !isParticipant(room, user.id)) return;

        const content = sanitizeMessageContent(msg?.content);
        if (!content) return;

        // Rebuilt server-side. Nothing the client claimed about *who sent this*
        // survives, so a client cannot post as another user.
        io.to(room.id).emit('chat-message', {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            roomId: room.id,
            senderId: String(user.id),
            senderName: user.name,
            content,
            createdAt: new Date().toISOString(),
        });
    });

    // Typing indicator — same authorisation, same room scope.
    socket.on('user-typing', (data: { roomId?: unknown }) => {
        const user = socketUsers.get(socket.id);
        if (!user) return;

        const room = parseDirectRoom(data?.roomId);
        if (!room || !isParticipant(room, user.id)) return;

        socket.to(room.id).emit('user-typing', { roomId: room.id, userId: String(user.id) });
    });

    socket.on('console-logs', async (data: { logs: any[] }) => {
        const logs = data.logs || [];
        if (!logs.length) return;

        // Only a socket that actually registered as a target-app may relay. An
        // unregistered socket emitting this was previously accepted outright.
        const appInfo = connectedClients.targetApps.get(socket.id);
        if (!appInfo) return;

        const enrichedLogs = logs.slice(0, MAX_RELAYED_LOGS).map((log) => ({
            ...log, appName: appInfo.appName, receivedAt: new Date().toISOString(),
        }));

        // Relayed to the (now authenticated) monitors room for live viewing.
        io.to('monitors').emit('console-logs', enrichedLogs);

        // The `prisma.log.create` fan-out that used to live here is GONE. It was
        // an unauthenticated, unbounded write into `logs` from any socket — the
        // same hole G2 closed on the HTTP side by 410-ing
        // `POST /api/console-logs/realtime`. Persistence has exactly one
        // supported path now: `POST /api/ingest`, which is keyed, rate limited,
        // size capped and project scoped. This channel is live view only.
    });

    socket.on('disconnect', () => {
        connectedClients.monitors.delete(socket.id);
        chatClients.delete(socket.id);
        socketUsers.delete(socket.id);
        chatLimiters.delete(socket.id);
        if (connectedClients.targetApps.has(socket.id)) {
            const appInfo = connectedClients.targetApps.get(socket.id);
            connectedClients.targetApps.delete(socket.id);
            io.to('monitors').emit('target-app-disconnected', appInfo);
        }
    });
});

// ── WebSocket Server Start ───────────────────────────────────
const WS_PORT = parseInt(process.env.WS_PORT || '8081');
server.listen(WS_PORT, () => {
    console.log(`🔌 WebSocket server listening on port ${WS_PORT}`);
}).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') console.warn(`⚠️ WebSocket port ${WS_PORT} is in use`);
    else console.error('WebSocket server error:', err);
});

app.get('/ws-endpoint', (_req: Request, res: Response) => res.status(200).send('WebSocket endpoint is running'));

// ── Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

app.get('/bug-tracker-client.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname, '../public/bug-tracker-client.js'));
});

/**
 * The SDK (spec G3). Served explicitly rather than left to `express.static` so
 * the headers are guaranteed: it is embedded by third-party pages, so it needs
 * `*` and a real cache policy. The version is in the *path*, so the file at a
 * given URL never changes meaning — a breaking SDK change ships as `/sdk/v2.js`.
 */
app.get('/sdk/v1.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(path.join(__dirname, '../public/sdk/v1.js'));
});

/** End-to-end fixture for the G3 acceptance test. */
app.get('/sdk/demo', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/sdk/demo.html'));
});

/** Alerting harness: drives the regression -> notification loop end to end. */
app.get('/sdk/test', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/sdk/test.html'));
});

app.get('/console-monitor', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/console-monitor.html'));
});

// ── Health & Root ────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
    res.json({
        message: 'ApexOps API Server is running!',
        version: '2.0.0',
        endpoints: {
            auth: ['/api/auth/register', '/api/auth/login', '/api/auth/profile'],
            logs: ['/api/logs', '/api/logs/stats', '/api/logs/:id'],
            projects: ['/api/projects', '/api/projects/:slug', '/api/projects/:slug/rotate-key'],
            team: ['/api/projects/:slug/members', '/api/projects/:slug/invites', '/api/invites/:token'],
            tickets: ['/api/tickets', '/api/tickets/stats', '/api/tickets/:id'],
            notes: ['/api/notes', '/api/notes/:id'],
            ingest: ['/api/ingest'],
            consoleLogs: ['/api/console-logs', '/api/console-logs/script'],
            ai: ['/api/ai/chat', '/api/ai/status'],
        },
    });
});

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: dbConnected ? 'connected' : 'disconnected' });
});

// ── API Routes ───────────────────────────────────────────────
import authRoutes from './api/auth';
import logsRoutes from './api/logs';
import ticketsRoutes from './api/tickets';
import notesRoutes from './api/notes';
import consoleLogsRoutes from './api/console-logs';
import aiRoutes from './api/ai';
import consoleMonitorRoutes from './api/console-monitor';
import chatRoutes from './api/chat';
import notificationsRoutes from './api/notifications';
import projectsRoutes from './api/projects';
import invitesRoutes from './api/invites';
import ingestRoutes from './api/ingest';

// Mounted before the JSON-body and CORS defaults matter to it: `api/ingest` sets
// its own permissive CORS and 1MB body cap, because it is the only route that
// legitimately accepts cross-origin posts from sites we do not control.
app.use('/api/ingest', ingestRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/projects', projectsRoutes);
// Root-mounted on purpose (T-D2): an invitee is not yet a member, so an accept
// route under `/api/projects/:slug` would 404 exactly the person it exists for.
app.use('/api/invites', invitesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/console-logs', consoleLogsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/console-monitor', consoleMonitorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Legacy Redirects ─────────────────────────────────────────
app.post('/register', (req: Request, res: Response) => res.redirect(307, '/api/auth/register'));
app.post('/login', (req: Request, res: Response) => res.redirect(307, '/api/auth/login'));
app.get('/profile', (req: Request, res: Response) => res.redirect(307, '/api/auth/profile'));

app.get('/api/console-logs/targets', (_req: Request, res: Response) => {
    res.json(Array.from(connectedClients.targetApps.values()));
});

// ── Error Handling ───────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found', path: _req.path, method: _req.method });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000');

const startServer = async (): Promise<void> => {
    try {
        await prisma.$connect();
        dbConnected = true;
        console.log('✅ Database connected (Prisma)');
    } catch (err: any) {
        console.error('⚠️ Database connection failed:', err.message);
        console.log('⚠️ Server will start without database (real-time features still work)');
    }

    // Only schedule pruning when the database is actually reachable; otherwise the
    // first tick just logs a connection failure every day.
    if (dbConnected) scheduleRetentionPrune();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔌 WebSocket port: ${WS_PORT} (socket.io)`);
        console.log(`💾 Database: ${dbConnected ? '✅ Connected' : '⚠️ Not connected'}`);
        console.log(`🛡️  Security: Helmet.js enabled`);
        console.log(`🤖 AI Status: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️ GEMINI_API_KEY not set'}`);
        console.log('\n📋 API Endpoints:');
        console.log('  Auth:         /api/auth/*');
        console.log('  Logs:         /api/logs/*');
        console.log('  Projects:     /api/projects/*');
        console.log('  Ingest (SDK): /api/ingest');
        console.log('  Tickets:      /api/tickets/*');
        console.log('  Notes:        /api/notes/*');
        console.log('  Console Logs: /api/console-logs/*');
        console.log('  AI Chat:      /api/ai/*');
    });
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

startServer();
