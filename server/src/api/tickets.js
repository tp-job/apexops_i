// api/tickets.js - Tickets API
const express = require('express');
const router = express.Router();
const { getPool } = require('../utils/db');

const pool = getPool();

/**
 * Helper: Parse JSONB fields safely
 */
const parseJsonb = (value, defaultValue = []) => {
    if (!value) return defaultValue;
    if (Array.isArray(value)) return value;
    try {
        return typeof value === 'string' ? JSON.parse(value) : defaultValue;
    } catch {
        return defaultValue;
    }
};

/**
 * Helper: Format ticket response
 */
const formatTicket = (row) => ({
    id: row.id ? `TICK-${String(row.id).padStart(3, '0')}` : row.id,
    title: row.title || '',
    description: row.description || '',
    status: row.status || 'open',
    priority: row.priority || 'medium',
    assignee: row.assignee || undefined,
    reporter: row.reporter || 'System',
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    tags: parseJsonb(row.tags, []),
    relatedLogs: parseJsonb(row.relatedLogs, [])
});

/**
 * GET /api/tickets
 * Get all tickets
 */
router.get('/', async (req, res) => {
    try {
        const { status, priority, assignee, limit = 100, offset = 0 } = req.query;
        
        let sql = `
            SELECT id, title, description, status, priority, assignee, reporter, 
                   created_at as "createdAt", updated_at as "updatedAt", 
                   tags, related_logs as "relatedLogs"
            FROM tickets
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filter by status
        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filter by priority
        if (priority) {
            sql += ` AND priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        // Filter by assignee
        if (assignee) {
            sql += ` AND assignee = $${paramIndex}`;
            params.push(assignee);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(sql, params);
        const tickets = result.rows.map(formatTicket);
        
        res.json(tickets);
    } catch (err) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/tickets/stats
 * Get ticket statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as open,
                COUNT(*) FILTER (WHERE status = 'in-progress') as "inProgress",
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'closed') as closed,
                COUNT(*) FILTER (WHERE priority = 'critical') as critical,
                COUNT(*) FILTER (WHERE priority = 'high') as high,
                COUNT(*) FILTER (WHERE priority = 'medium') as medium,
                COUNT(*) FILTER (WHERE priority = 'low') as low
            FROM tickets
        `);

        const stats = result.rows[0];
        res.json({
            total: parseInt(stats.total) || 0,
            byStatus: {
                open: parseInt(stats.open) || 0,
                inProgress: parseInt(stats.inProgress) || 0,
                resolved: parseInt(stats.resolved) || 0,
                closed: parseInt(stats.closed) || 0
            },
            byPriority: {
                critical: parseInt(stats.critical) || 0,
                high: parseInt(stats.high) || 0,
                medium: parseInt(stats.medium) || 0,
                low: parseInt(stats.low) || 0
            }
        });
    } catch (err) {
        console.error('Error fetching ticket stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
});

/**
 * GET /api/tickets/:id
 * Get ticket by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const ticketId = req.params.id.replace('TICK-', '');
        
        const result = await pool.query(`
            SELECT id, title, description, status, priority, assignee, reporter, 
                   created_at as "createdAt", updated_at as "updatedAt", 
                   tags, related_logs as "relatedLogs"
            FROM tickets WHERE id = $1
        `, [ticketId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(formatTicket(result.rows[0]));
    } catch (err) {
        console.error('Error fetching ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch ticket' });
    }
});

/**
 * POST /api/tickets
 * Create new ticket
 */
router.post('/', async (req, res) => {
    try {
        const { 
            title, 
            description, 
            status = 'open', 
            priority = 'medium', 
            assignee, 
            reporter = 'System', 
            tags = [], 
            relatedLogs = [] 
        } = req.body;

        // Validation
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = await pool.query(`
            INSERT INTO tickets (title, description, status, priority, assignee, reporter, tags, related_logs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, created_at as "createdAt", updated_at as "updatedAt"
        `, [
            title, 
            description || '', 
            status, 
            priority, 
            assignee || null, 
            reporter, 
            JSON.stringify(tags), 
            JSON.stringify(relatedLogs)
        ]);

        const ticket = {
            id: `TICK-${String(result.rows[0].id).padStart(3, '0')}`,
            title,
            description: description || '',
            status,
            priority,
            assignee: assignee || undefined,
            reporter,
            createdAt: result.rows[0].createdAt.toISOString(),
            updatedAt: result.rows[0].updatedAt?.toISOString() || result.rows[0].createdAt.toISOString(),
            tags: Array.isArray(tags) ? tags : [],
            relatedLogs: Array.isArray(relatedLogs) ? relatedLogs : []
        };

        res.status(201).json(ticket);
    } catch (err) {
        console.error('Error creating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
});

/**
 * PUT /api/tickets/:id
 * Update ticket
 */
router.put('/:id', async (req, res) => {
    try {
        const ticketId = req.params.id.replace('TICK-', '');
        const { title, description, status, priority, assignee, tags } = req.body;

        // First update the ticket
        await pool.query(`
            UPDATE tickets
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                priority = COALESCE($4, priority),
                assignee = COALESCE($5, assignee),
                tags = COALESCE($6, tags),
                updated_at = NOW()
            WHERE id = $7
        `, [
            title, 
            description, 
            status, 
            priority, 
            assignee || null, 
            tags ? JSON.stringify(tags) : null,
            ticketId
        ]);

        // Then fetch the updated ticket
        const result = await pool.query(`
            SELECT id, title, description, status, priority, assignee, reporter, 
                   created_at as "createdAt", updated_at as "updatedAt", 
                   tags, related_logs as "relatedLogs"
            FROM tickets WHERE id = $1
        `, [ticketId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json(formatTicket(result.rows[0]));
    } catch (err) {
        console.error('Error updating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to update ticket' });
    }
});

/**
 * DELETE /api/tickets/:id
 * Delete ticket
 */
router.delete('/:id', async (req, res) => {
    try {
        const ticketId = req.params.id.replace('TICK-', '');
        
        const result = await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ deleted: true, id: req.params.id });
    } catch (err) {
        console.error('Error deleting ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to delete ticket' });
    }
});

module.exports = router;

