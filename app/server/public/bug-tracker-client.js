/**
 * ApexOps Bug Tracker - Client Inject Script
 * 
 * วิธีใช้: เพิ่ม script นี้ใน target app ที่ต้องการ monitor
 * <script src="http://localhost:3000/bug-tracker-client.js"></script>
 * 
 * หรือ copy-paste โค้ดด้านล่างใน console ของ browser
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        serverUrl: window.BUG_TRACKER_SERVER || 'http://localhost:3000',
        wsPort: window.BUG_TRACKER_WS_PORT || 8082, // Native WebSocket port (not socket.io)
        appName: window.BUG_TRACKER_APP_NAME || document.title || window.location.hostname,
        batchInterval: 100, // ms - batch logs to reduce network calls
        maxBatchSize: 50,
        reconnectInterval: 3000,
        debug: false
    };

    // State
    let ws = null;
    let isConnected = false;
    let logQueue = [];
    let batchTimer = null;
    let reconnectTimer = null;

    // Original console methods
    const originalConsole = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };

    // Utility: Format stack trace
    function getStackTrace() {
        try {
            const stack = new Error().stack;
            if (!stack) return null;
            
            // Skip first 3 lines (Error, getStackTrace, intercepted console method)
            const lines = stack.split('\n').slice(3);
            return lines.join('\n');
        } catch (e) {
            return null;
        }
    }

    // Utility: Serialize arguments safely
    function serializeArgs(args) {
        return args.map(arg => {
            try {
                if (arg === undefined) return 'undefined';
                if (arg === null) return 'null';
                if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
                if (typeof arg === 'symbol') return arg.toString();
                if (arg instanceof Error) {
                    return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
                }
                if (typeof arg === 'object') {
                    // Handle circular references
                    const seen = new WeakSet();
                    return JSON.stringify(arg, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) return '[Circular]';
                            seen.add(value);
                        }
                        return value;
                    }, 2);
                }
                return String(arg);
            } catch (e) {
                return '[Unserializable]';
            }
        }).join(' ');
    }

    // Map console type to log level
    function mapLevel(type) {
        switch (type) {
            case 'error': return 'error';
            case 'warn': return 'warning';
            case 'info': return 'info';
            case 'debug': return 'debug';
            default: return 'info';
        }
    }

    // Queue log for batching
    function queueLog(logEntry) {
        logQueue.push(logEntry);
        
        // Send immediately if batch is full
        if (logQueue.length >= CONFIG.maxBatchSize) {
            flushLogs();
        } else if (!batchTimer) {
            batchTimer = setTimeout(flushLogs, CONFIG.batchInterval);
        }
    }

    // Flush logs to server
    function flushLogs() {
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }

        if (logQueue.length === 0) return;

        const logsToSend = logQueue.splice(0, CONFIG.maxBatchSize);

        if (isConnected && ws && ws.readyState === WebSocket.OPEN) {
            // Send via WebSocket
            ws.send(JSON.stringify({
                type: 'console-logs',
                logs: logsToSend
            }));
        } else {
            // Fallback to HTTP
            fetch(`${CONFIG.serverUrl}/api/console-logs/realtime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: logsToSend })
            }).catch(() => {
                // Silent fail - don't spam console with errors
            });
        }
    }

    // Intercept console method
    function interceptConsole(type) {
        console[type] = function(...args) {
            // Call original method
            originalConsole[type](...args);

            // Create log entry
            const logEntry = {
                id: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                level: mapLevel(type),
                message: serializeArgs(args),
                source: window.location.href,
                appName: CONFIG.appName,
                stack: type === 'error' ? getStackTrace() : null,
                userAgent: navigator.userAgent
            };

            queueLog(logEntry);
        };
    }

    // Intercept uncaught errors
    function interceptErrors() {
        // Window error event
        window.addEventListener('error', (event) => {
            const logEntry = {
                id: `rt-err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                level: 'error',
                message: event.message || 'Unknown error',
                source: event.filename || window.location.href,
                appName: CONFIG.appName,
                stack: event.error?.stack || `at ${event.filename}:${event.lineno}:${event.colno}`,
                userAgent: navigator.userAgent
            };
            queueLog(logEntry);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            const logEntry = {
                id: `rt-rej-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                level: 'error',
                message: reason instanceof Error 
                    ? `Unhandled Promise Rejection: ${reason.message}`
                    : `Unhandled Promise Rejection: ${String(reason)}`,
                source: window.location.href,
                appName: CONFIG.appName,
                stack: reason instanceof Error ? reason.stack : null,
                userAgent: navigator.userAgent
            };
            queueLog(logEntry);
        });
    }

    // Connect WebSocket
    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
            return;
        }

        try {
            const wsUrl = `ws://${new URL(CONFIG.serverUrl).hostname}:${CONFIG.wsPort}`;
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                isConnected = true;
                if (CONFIG.debug) originalConsole.log('[BugTracker] WebSocket connected');
                
                // Register this client
                ws.send(JSON.stringify({
                    type: 'register',
                    clientType: 'target-app',
                    appName: CONFIG.appName,
                    url: window.location.href
                }));

                // Clear reconnect timer
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
            };

            ws.onclose = () => {
                isConnected = false;
                if (CONFIG.debug) originalConsole.log('[BugTracker] WebSocket disconnected');
                
                // Schedule reconnect
                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(connectWebSocket, CONFIG.reconnectInterval);
                }
            };

            ws.onerror = () => {
                // WebSocket errors are handled by onclose
            };

        } catch (e) {
            if (CONFIG.debug) originalConsole.error('[BugTracker] WebSocket connection failed:', e);
        }
    }

    // Initialize
    function init() {
        // Intercept console methods
        ['log', 'error', 'warn', 'info', 'debug'].forEach(interceptConsole);

        // Intercept uncaught errors
        interceptErrors();

        // Connect WebSocket
        connectWebSocket();

        // Flush remaining logs on page unload
        window.addEventListener('beforeunload', () => {
            flushLogs();
        });

        // Log initialization
        if (CONFIG.debug) {
            originalConsole.log('[BugTracker] Client initialized for:', CONFIG.appName);
        }
    }

    // Start
    init();

    // Expose API for manual control
    window.__BugTracker = {
        config: CONFIG,
        flush: flushLogs,
        reconnect: connectWebSocket,
        isConnected: () => isConnected
    };

})();

