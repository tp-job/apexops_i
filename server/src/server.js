// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer();
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Native WebSocket Server for inject script (separate from socket.io)
const NATIVE_WS_PORT = process.env.NATIVE_WS_PORT || 8082;
const wss = new WebSocket.Server({ port: NATIVE_WS_PORT });

// Track native WebSocket clients
const nativeWsClients = {
    monitors: new Set(),
    targetApps: new Map()
};

wss.on('listening', () => {
    console.log(`🔌 Native WebSocket server listening on port ${NATIVE_WS_PORT}`);
});

wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Native WebSocket port ${NATIVE_WS_PORT} is in use`);
    } else {
        console.error('Native WebSocket error:', err);
    }
});

wss.on('connection', (ws) => {
    console.log('🎯 Target app connected via Native WebSocket');
    let clientInfo = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'register') {
                // Register target app
                clientInfo = {
                    appName: message.appName || 'Unknown App',
                    url: message.url || 'Unknown URL',
                    connectedAt: new Date().toISOString()
                };
                nativeWsClients.targetApps.set(ws, clientInfo);
                console.log('🎯 Target app registered:', clientInfo.appName, '-', clientInfo.url);
                
                // Notify socket.io monitors about new target app
                io.to('monitors').emit('target-app-connected', {
                    ...clientInfo,
                    socketId: 'native-' + Date.now()
                });
            } 
            else if (message.type === 'console-logs') {
                // Receive logs from target app and broadcast to monitors
                const logs = message.logs || [];
                if (logs.length > 0) {
                    const enrichedLogs = logs.map(log => ({
                        ...log,
                        appName: clientInfo?.appName || log.appName,
                        receivedAt: new Date().toISOString()
                    }));
                    
                    // Broadcast to socket.io monitors
                    io.to('monitors').emit('console-logs', enrichedLogs);
                    
                    // Save to database (async) - skip if DB not connected
                    if (dbConnected) {
                        enrichedLogs.forEach(log => {
                            pool.query(
                                'INSERT INTO logs (level, message, source, stack) VALUES ($1, $2, $3, $4)',
                                [log.level, log.message, log.source, log.stack || null]
                            ).catch(err => console.error('Error saving log:', err.message));
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error processing native WebSocket message:', err);
        }
    });

    ws.on('close', () => {
        if (clientInfo) {
            console.log('🎯 Target app disconnected:', clientInfo.appName);
            nativeWsClients.targetApps.delete(ws);
            
            // Notify socket.io monitors
            io.to('monitors').emit('target-app-disconnected', clientInfo);
        }
    });

    ws.on('error', (err) => {
        console.error('Native WebSocket client error:', err.message);
    });
});

// ----------------------------
// 🔗 Connect PostgreSQL
// ----------------------------
const pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'apexops_db',
    password: process.env.PG_PASSWORD || 'postgres',
    port: parseInt(process.env.PG_PORT || '5432'),
});

// Import database initialization
const { initDatabase } = require('./database/initDatabase');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ----------------------------
// 🌐 WebSocket Setup (Optional)
// ----------------------------
const WS_PORT = process.env.WS_PORT || 8081;

// Only start WebSocket if not already in use
const startWebSocket = () => {
    server.listen(WS_PORT, () => {
        console.log(`🔌 WebSocket server listening on port ${WS_PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ WebSocket port ${WS_PORT} is in use, skipping WebSocket server`);
        } else {
            console.error('WebSocket server error:', err);
        }
    });
};

// Track connected clients
const connectedClients = {
    monitors: new Set(),    // Bug Tracker UI clients
    targetApps: new Map()   // Target apps being monitored (socket.id -> appInfo)
};

io.on('connection', (socket) => {
    console.log('👤 User connected via WebSocket:', socket.id);
    
    // Client registration
    socket.on('register', (data) => {
        if (data.clientType === 'monitor') {
            // Bug Tracker UI registering to receive logs
            connectedClients.monitors.add(socket.id);
            socket.join('monitors');
            console.log('📊 Monitor client registered:', socket.id);
            
            // Send list of currently connected target apps
            const targetApps = Array.from(connectedClients.targetApps.values());
            socket.emit('target-apps-list', targetApps);
        } else if (data.clientType === 'target-app') {
            // Target app registering to send logs
            const appInfo = {
                socketId: socket.id,
                appName: data.appName || 'Unknown App',
                url: data.url || 'Unknown URL',
                connectedAt: new Date().toISOString()
            };
            connectedClients.targetApps.set(socket.id, appInfo);
            socket.join('target-apps');
            console.log('🎯 Target app registered:', appInfo.appName, '-', appInfo.url);
            
            // Notify monitors about new target app
            io.to('monitors').emit('target-app-connected', appInfo);
        }
    });
    
    // Receive console logs from target apps
    socket.on('console-logs', async (data) => {
        const logs = data.logs || [];
        if (logs.length === 0) return;
        
        // Add socket info to logs
        const appInfo = connectedClients.targetApps.get(socket.id);
        const enrichedLogs = logs.map(log => ({
            ...log,
            appName: appInfo?.appName || log.appName,
            receivedAt: new Date().toISOString()
        }));
        
        // Broadcast to all monitor clients in real-time
        io.to('monitors').emit('console-logs', enrichedLogs);
        
        // Save to database (async, don't wait)
        enrichedLogs.forEach(log => {
            pool.query(
                'INSERT INTO logs (level, message, source, stack) VALUES ($1, $2, $3, $4)',
                [log.level, log.message, log.source, log.stack || null]
            ).catch(err => console.error('Error saving log to DB:', err.message));
        });
    });
    
    socket.on('disconnect', () => {
        console.log('👤 User disconnected:', socket.id);
        
        // Clean up from monitors
        if (connectedClients.monitors.has(socket.id)) {
            connectedClients.monitors.delete(socket.id);
        }
        
        // Clean up from target apps and notify monitors
        if (connectedClients.targetApps.has(socket.id)) {
            const appInfo = connectedClients.targetApps.get(socket.id);
            connectedClients.targetApps.delete(socket.id);
            io.to('monitors').emit('target-app-disconnected', appInfo);
        }
    });
});

app.get('/ws-endpoint', (req, res) => {
    res.status(200).send('WebSocket endpoint is running');
});

// Start WebSocket server
startWebSocket();
// ----------------------------END----------------------------

// ----------------------------
// 📁 Serve Static Files (Bug Tracker Client Script)
// ----------------------------
app.use(express.static(path.join(__dirname, '../public')));

// Serve inject script with proper CORS
app.get('/bug-tracker-client.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname, '../public/bug-tracker-client.js'));
});

// Serve console monitor UI
app.get('/console-monitor', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/console-monitor.html'));
});

// ----------------------------
// 🏠 Health Check & Root Route
// ----------------------------
app.get('/', (req, res) => {
    res.json({
        message: 'ApexOps API Server is running!',
        version: '1.0.0',
        endpoints: {
            auth: ['/api/auth/register', '/api/auth/login', '/api/auth/profile'],
            logs: ['/api/logs', '/api/logs/stats', '/api/logs/:id'],
            tickets: ['/api/tickets', '/api/tickets/stats', '/api/tickets/:id'],
            notes: ['/api/notes', '/api/notes/:id'],
            consoleLogs: ['/api/console-logs', '/api/console-logs/realtime', '/api/console-logs/script'],
            ai: ['/api/ai/chat', '/api/ai/status']
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected'
    });
});

// ----------------------------
// 🔐 API Routes
// ----------------------------

// Auth API
const authApiRoutes = require('./api/auth');
app.use('/api/auth', authApiRoutes);

// Logs API
const logsApiRoutes = require('./api/logs');
app.use('/api/logs', logsApiRoutes);

// Tickets API
const ticketsApiRoutes = require('./api/tickets');
app.use('/api/tickets', ticketsApiRoutes);

// Notes API
const notesApiRoutes = require('./api/notes');
app.use('/api/notes', notesApiRoutes);

// Console Logs API
const consoleLogsApiRoutes = require('./api/console-logs');
app.use('/api/console-logs', consoleLogsApiRoutes);

// AI Chat API
const aiRoutes = require('./api/ai');
app.use('/api/ai', aiRoutes);

// Console Monitor API
const consoleMonitorRoutes = require('./api/console-monitor');
app.use('/api/console-monitor', consoleMonitorRoutes);

// ----------------------------
// 🔄 Legacy Routes (Backward Compatibility)
// ----------------------------
const legacyAuthRoutes = require('./routes/auth');
app.use('/api/auth-legacy', legacyAuthRoutes);

const legacyNoteRoutes = require('./routes/notes');
app.use('/api/notes-legacy', legacyNoteRoutes);

// Legacy auth endpoints (redirect to new API)
app.post('/register', (req, res) => {
    res.redirect(307, '/api/auth/register');
});

app.post('/login', (req, res) => {
    res.redirect(307, '/api/auth/login');
});

app.get('/profile', (req, res) => {
    res.redirect(307, '/api/auth/profile');
});

// Get connected target apps
app.get('/api/console-logs/targets', (req, res) => {
    const targets = Array.from(connectedClients.targetApps.values());
    res.json(targets);
});

// ----------------------------
// ❌ Error Handling Middleware
// ----------------------------
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ----------------------------
// 🚫 404 Handler
// ----------------------------
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

const PORT = process.env.PORT || 3000;

// Track database status
let dbConnected = false;

// Start server - try database but don't fail if it's unavailable
const startServer = async () => {
    try {
        await initDatabase(pool);
        dbConnected = true;
        console.log('✅ Database connected');
    } catch (err) {
        console.error('⚠️ Database initialization failed:', err.message);
        console.log('⚠️ Server will start without database (real-time features still work)');
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔌 WebSocket ports: 8081 (socket.io), 8082 (native)`);
        console.log(`💾 Database: ${dbConnected ? '✅ Connected' : '⚠️ Not connected'}`);
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

startServer();
