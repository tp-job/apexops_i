// api/console-monitor.js - Real-time Console Monitoring API
const express = require('express');
const router = express.Router();
const { getPool } = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const pool = getPool();

// Store active monitoring sessions
const activeSessions = new Map(); // sessionId -> { url, socketId, startedAt, logCount }

/**
 * GET /api/console-monitor/sessions
 * Get all active monitoring sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
    try {
        const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
            sessionId: id,
            ...data
        }));
        
        res.json({
            total: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

/**
 * POST /api/console-monitor/sessions
 * Create new monitoring session
 */
router.post('/sessions', authenticate, async (req, res) => {
    try {
        const { url, appName } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        activeSessions.set(sessionId, {
            url,
            appName: appName || url,
            userId: req.user.id,
            startedAt: new Date().toISOString(),
            logCount: 0,
            status: 'active'
        });
        
        res.status(201).json({
            sessionId,
            url,
            appName: appName || url,
            startedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * DELETE /api/console-monitor/sessions/:sessionId
 * Stop monitoring session
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!activeSessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = activeSessions.get(sessionId);
        
        // Check if user owns this session
        if (session.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        activeSessions.delete(sessionId);
        
        res.json({
            message: 'Session stopped',
            sessionId,
            logCount: session.logCount
        });
    } catch (error) {
        console.error('Error stopping session:', error);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

/**
 * GET /api/console-monitor/logs/:sessionId
 * Get logs for specific session
 */
router.get('/logs/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { level, limit = 100, offset = 0 } = req.query;
        
        if (!activeSessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = activeSessions.get(sessionId);
        
        let sql = `
            SELECT id, level, message, source, stack, created_at as timestamp
            FROM logs
            WHERE source = $1
        `;
        const params = [session.url];
        let paramIndex = 2;
        
        if (level) {
            sql += ` AND level = $${paramIndex}`;
            params.push(level);
            paramIndex++;
        }
        
        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(sql, params);
        
        const logs = result.rows.map(row => ({
            id: row.id.toString(),
            timestamp: row.timestamp.toISOString(),
            level: row.level,
            message: row.message,
            source: row.source,
            stack: row.stack || undefined
        }));
        
        res.json({
            sessionId,
            total: logs.length,
            logs
        });
    } catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

/**
 * GET /api/console-monitor/stats/:sessionId
 * Get statistics for specific session
 */
router.get('/stats/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!activeSessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = activeSessions.get(sessionId);
        
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE level = 'error') as errors,
                COUNT(*) FILTER (WHERE level = 'warning') as warnings,
                COUNT(*) FILTER (WHERE level = 'info') as info,
                MIN(created_at) as first_log,
                MAX(created_at) as last_log
            FROM logs
            WHERE source = $1
        `, [session.url]);
        
        const stats = result.rows[0];
        
        res.json({
            sessionId,
            url: session.url,
            startedAt: session.startedAt,
            stats: {
                total: parseInt(stats.total) || 0,
                errors: parseInt(stats.errors) || 0,
                warnings: parseInt(stats.warnings) || 0,
                info: parseInt(stats.info) || 0,
                firstLog: stats.first_log,
                lastLog: stats.last_log
            }
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * POST /api/console-monitor/clear/:sessionId
 * Clear logs for specific session
 */
router.post('/clear/:sessionId', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!activeSessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = activeSessions.get(sessionId);
        
        // Check if user owns this session
        if (session.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const result = await pool.query(
            'DELETE FROM logs WHERE source = $1',
            [session.url]
        );
        
        res.json({
            message: 'Logs cleared',
            sessionId,
            deleted: result.rowCount
        });
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

/**
 * Helper: Update session log count
 */
function updateSessionLogCount(url) {
    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.url === url) {
            session.logCount++;
        }
    }
}

// Export for use in WebSocket handlers
module.exports = router;
module.exports.activeSessions = activeSessions;
module.exports.updateSessionLogCount = updateSessionLogCount;

