// api/logs.js - Logs API
const express = require('express');
const router = express.Router();
const { getPool } = require('../utils/db');

const pool = getPool();

/**
 * Helper: Format log response
 */
const formatLog = (row) => ({
    id: row.id.toString(),
    timestamp: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
    level: row.level || 'info',
    message: row.message || '',
    source: row.source || 'unknown',
    stack: row.stack || undefined
});

/**
 * GET /api/logs
 * Get all logs with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { level, source, limit = 100, offset = 0 } = req.query;
        
        let sql = `
            SELECT id, level, message, source, stack, created_at as timestamp
            FROM logs
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filter by level
        if (level) {
            sql += ` AND level = $${paramIndex}`;
            params.push(level);
            paramIndex++;
        }

        // Filter by source
        if (source) {
            sql += ` AND source ILIKE $${paramIndex}`;
            params.push(`%${source}%`);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(sql, params);
        const logs = result.rows.map(formatLog);
        
        res.json(logs);
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch logs' });
    }
});

/**
 * GET /api/logs/stats
 * Get log statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE level = 'error') as errors,
                COUNT(*) FILTER (WHERE level = 'warning') as warnings,
                COUNT(*) FILTER (WHERE level = 'info') as info,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as "last24Hours",
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "last7Days"
            FROM logs
        `);

        const stats = result.rows[0];
        res.json({
            total: parseInt(stats.total) || 0,
            byLevel: {
                errors: parseInt(stats.errors) || 0,
                warnings: parseInt(stats.warnings) || 0,
                info: parseInt(stats.info) || 0
            },
            last24Hours: parseInt(stats.last24Hours) || 0,
            last7Days: parseInt(stats.last7Days) || 0
        });
    } catch (err) {
        console.error('Error fetching log stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
});

/**
 * GET /api/logs/:id
 * Get log by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, level, message, source, stack, created_at as timestamp
            FROM logs WHERE id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json(formatLog(result.rows[0]));
    } catch (err) {
        console.error('Error fetching log:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch log' });
    }
});

/**
 * POST /api/logs
 * Create new log entry
 */
router.post('/', async (req, res) => {
    try {
        const { level = 'info', message, source = 'unknown', stack } = req.body;

        // Validation
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const result = await pool.query(`
            INSERT INTO logs (level, message, source, stack)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at as timestamp
        `, [level, message, source, stack || null]);

        const log = {
            id: result.rows[0].id.toString(),
            timestamp: result.rows[0].timestamp.toISOString(),
            level,
            message,
            source,
            stack: stack || undefined
        };

        res.status(201).json(log);
    } catch (err) {
        console.error('Error creating log:', err);
        res.status(500).json({ error: err.message || 'Failed to create log' });
    }
});

/**
 * POST /api/logs/batch
 * Create multiple log entries
 */
router.post('/batch', async (req, res) => {
    try {
        const { logs: logEntries } = req.body;

        if (!Array.isArray(logEntries) || logEntries.length === 0) {
            return res.status(400).json({ error: 'logs array is required' });
        }

        const results = [];
        for (const log of logEntries) {
            const { level = 'info', message, source = 'unknown', stack } = log;
            if (message) {
                const result = await pool.query(`
                    INSERT INTO logs (level, message, source, stack)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, created_at as timestamp
                `, [level, message, source, stack || null]);
                
                results.push({
                    id: result.rows[0].id.toString(),
                    timestamp: result.rows[0].timestamp.toISOString(),
                    level,
                    message,
                    source,
                    stack: stack || undefined
                });
            }
        }

        res.status(201).json({ created: results.length, logs: results });
    } catch (err) {
        console.error('Error creating batch logs:', err);
        res.status(500).json({ error: err.message || 'Failed to create logs' });
    }
});

/**
 * DELETE /api/logs/:id
 * Delete log entry
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM logs WHERE id = $1', [req.params.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json({ deleted: true, id: req.params.id });
    } catch (err) {
        console.error('Error deleting log:', err);
        res.status(500).json({ error: err.message || 'Failed to delete log' });
    }
});

/**
 * DELETE /api/logs
 * Delete all logs (with optional filters)
 */
router.delete('/', async (req, res) => {
    try {
        const { level, olderThan } = req.query;
        
        let sql = 'DELETE FROM logs WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (level) {
            sql += ` AND level = $${paramIndex}`;
            params.push(level);
            paramIndex++;
        }

        if (olderThan) {
            sql += ` AND created_at < $${paramIndex}`;
            params.push(new Date(olderThan));
            paramIndex++;
        }

        const result = await pool.query(sql, params);
        
        res.json({ deleted: result.rowCount });
    } catch (err) {
        console.error('Error deleting logs:', err);
        res.status(500).json({ error: err.message || 'Failed to delete logs' });
    }
});

module.exports = router;

