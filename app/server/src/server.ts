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
import WebSocket from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import type { ChatMessage } from './utils/chat';
import prisma from './lib/prisma';

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

// ── Native WebSocket Server ──────────────────────────────────
const NATIVE_WS_PORT = parseInt(process.env.NATIVE_WS_PORT || '8082');
const wss = new WebSocket.Server({ port: NATIVE_WS_PORT });

interface ClientInfo {
    appName: string;
    url: string;
    connectedAt: string;
}

const nativeWsClients = {
    monitors: new Set<WebSocket>(),
    targetApps: new Map<WebSocket, ClientInfo>(),
};

let dbConnected = false;

wss.on('listening', () => console.log(`🔌 Native WebSocket server listening on port ${NATIVE_WS_PORT}`));
wss.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') console.warn(`⚠️ Native WebSocket port ${NATIVE_WS_PORT} is in use`);
    else console.error('Native WebSocket error:', err);
});

wss.on('connection', (ws: WebSocket) => {
    console.log('🎯 Target app connected via Native WebSocket');
    let clientInfo: ClientInfo | null = null;

    ws.on('message', (data: WebSocket.RawData) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'register') {
                clientInfo = { appName: message.appName || 'Unknown', url: message.url || 'Unknown', connectedAt: new Date().toISOString() };
                nativeWsClients.targetApps.set(ws, clientInfo);
                io.to('monitors').emit('target-app-connected', { ...clientInfo, socketId: 'native-' + Date.now() });
            } else if (message.type === 'console-logs') {
                const logs = message.logs || [];
                if (logs.length > 0) {
                    const enrichedLogs = logs.map((log: any) => ({
                        ...log, appName: clientInfo?.appName || log.appName, receivedAt: new Date().toISOString(),
                    }));
                    io.to('monitors').emit('console-logs', enrichedLogs);

                    if (dbConnected) {
                        enrichedLogs.forEach((log: any) => {
                            prisma.log.create({ data: { level: log.level, message: log.message, source: log.source, stack: log.stack || null } }).catch(() => {});
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error processing native WS message:', err);
        }
    });

    ws.on('close', () => {
        if (clientInfo) {
            nativeWsClients.targetApps.delete(ws);
            io.to('monitors').emit('target-app-disconnected', clientInfo);
        }
    });

    ws.on('error', (err: Error) => console.error('Native WS client error:', err.message));
});

// ── Socket.IO Events ─────────────────────────────────────────
interface AppInfo {
    socketId: string;
    appName: string;
    url: string;
    connectedAt: string;
}

const connectedClients = {
    monitors: new Set<string>(),
    targetApps: new Map<string, AppInfo>(),
};

// Simple in-memory registry for chat clients (Instagram-style DM demo)
const chatClients = new Map<string, { userId: string }>();

io.on('connection', (socket) => {
    console.log('👤 User connected via WebSocket:', socket.id);

    socket.on('register', (data: { clientType: string; appName?: string; url?: string; userId?: string }) => {
        if (data.clientType === 'monitor') {
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
        } else if (data.clientType === 'chat' && data.userId) {
            // Chat client (used by frontend Chat page)
            chatClients.set(socket.id, { userId: data.userId });
            socket.join('chat-users');
            console.log('💬 Chat client registered:', data.userId, 'via', socket.id);
        }
    });

    // Real-time chat message broadcast (Instagram-style DM UI)
    socket.on('chat-message', (msg: ChatMessage) => {
        // Basic validation: must have roomId and senderId
        if (!msg?.roomId || !msg?.senderId) return;

        // Echo message to all connected chat clients (frontend filters by roomId)
        io.to('chat-users').emit('chat-message', msg);
    });

    // Typing indicator
    socket.on('user-typing', (data: { roomId: string; userId: string }) => {
        if (!data?.roomId || !data?.userId) return;

        // Broadcast to other chat users (except sender)
        socket.to('chat-users').emit('user-typing', data);
    });

    socket.on('console-logs', async (data: { logs: any[] }) => {
        const logs = data.logs || [];
        if (!logs.length) return;
        const appInfo = connectedClients.targetApps.get(socket.id);
        const enrichedLogs = logs.map((log) => ({
            ...log, appName: appInfo?.appName || log.appName, receivedAt: new Date().toISOString(),
        }));
        io.to('monitors').emit('console-logs', enrichedLogs);

        enrichedLogs.forEach((log) => {
            prisma.log.create({ data: { level: log.level, message: log.message, source: log.source, stack: log.stack || null } }).catch(() => {});
        });
    });

    socket.on('disconnect', () => {
        connectedClients.monitors.delete(socket.id);
        chatClients.delete(socket.id);
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
            tickets: ['/api/tickets', '/api/tickets/stats', '/api/tickets/:id'],
            notes: ['/api/notes', '/api/notes/:id'],
            consoleLogs: ['/api/console-logs', '/api/console-logs/realtime', '/api/console-logs/script'],
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

app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/console-logs', consoleLogsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/console-monitor', consoleMonitorRoutes);
app.use('/api/chat', chatRoutes);

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

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔌 WebSocket ports: ${WS_PORT} (socket.io), ${NATIVE_WS_PORT} (native)`);
        console.log(`💾 Database: ${dbConnected ? '✅ Connected' : '⚠️ Not connected'}`);
        console.log(`🛡️  Security: Helmet.js enabled`);
        console.log(`🤖 AI Status: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️ GEMINI_API_KEY not set'}`);
        console.log('\n📋 API Endpoints:');
        console.log('  Auth:         /api/auth/*');
        console.log('  Logs:         /api/logs/*');
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
