// models/TicketModel.js
const { query } = require('../utils/db');

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
 * Helper: Format ticket for response
 */
const formatTicket = (row) => {
    if (!row) return null;
    return {
        id: row.id ? `TICK-${String(row.id).padStart(3, '0')}` : null,
        title: row.title || '',
        description: row.description || '',
        status: row.status || 'open',
        priority: row.priority || 'medium',
        assignee: row.assignee || undefined,
        reporter: row.reporter || 'System',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        tags: parseJsonb(row.tags, []),
        relatedLogs: parseJsonb(row.related_logs, [])
    };
};

const TicketModel = {
    /**
     * Get all tickets with optional filtering
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} List of tickets
     */
    async getAll(options = {}) {
        const { status, priority, assignee, limit = 100, offset = 0 } = options;
        
        let sql = 'SELECT * FROM tickets WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            sql += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (priority) {
            sql += ` AND priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        if (assignee) {
            sql += ` AND assignee = $${paramIndex}`;
            params.push(assignee);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows.map(formatTicket);
    },

    /**
     * Get ticket by ID
     * @param {string|number} id - Ticket ID
     * @returns {Promise<Object|null>} Ticket object or null
     */
    async getById(id) {
        const ticketId = String(id).replace('TICK-', '');
        const result = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
        return result.rows.length > 0 ? formatTicket(result.rows[0]) : null;
    },

    /**
     * Create new ticket
     * @param {Object} ticketData - Ticket data
     * @returns {Promise<Object>} Created ticket
     */
    async create(ticketData) {
        const { 
            title, 
            description = '', 
            status = 'open', 
            priority = 'medium',
            assignee = null,
            reporter = 'System',
            tags = [],
            relatedLogs = []
        } = ticketData;

        const result = await query(
            `INSERT INTO tickets (title, description, status, priority, assignee, reporter, tags, related_logs)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [title, description, status, priority, assignee, reporter, JSON.stringify(tags), JSON.stringify(relatedLogs)]
        );

        return formatTicket(result.rows[0]);
    },

    /**
     * Update ticket
     * @param {string|number} id - Ticket ID
     * @param {Object} ticketData - Fields to update
     * @returns {Promise<Object|null>} Updated ticket or null
     */
    async update(id, ticketData) {
        const ticketId = String(id).replace('TICK-', '');
        const { title, description, status, priority, assignee, tags } = ticketData;

        await query(
            `UPDATE tickets
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 status = COALESCE($3, status),
                 priority = COALESCE($4, priority),
                 assignee = COALESCE($5, assignee),
                 tags = COALESCE($6, tags),
                 updated_at = NOW()
             WHERE id = $7`,
            [title, description, status, priority, assignee, tags ? JSON.stringify(tags) : null, ticketId]
        );

        const result = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
        return result.rows.length > 0 ? formatTicket(result.rows[0]) : null;
    },

    /**
     * Delete ticket
     * @param {string|number} id - Ticket ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        const ticketId = String(id).replace('TICK-', '');
        const result = await query('DELETE FROM tickets WHERE id = $1', [ticketId]);
        return result.rowCount > 0;
    },

    /**
     * Get ticket statistics
     * @returns {Promise<Object>} Stats object
     */
    async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as open,
                COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'closed') as closed,
                COUNT(*) FILTER (WHERE priority = 'critical') as critical,
                COUNT(*) FILTER (WHERE priority = 'high') as high,
                COUNT(*) FILTER (WHERE priority = 'medium') as medium,
                COUNT(*) FILTER (WHERE priority = 'low') as low
            FROM tickets
        `);

        const stats = result.rows[0];
        return {
            total: parseInt(stats.total) || 0,
            byStatus: {
                open: parseInt(stats.open) || 0,
                inProgress: parseInt(stats.in_progress) || 0,
                resolved: parseInt(stats.resolved) || 0,
                closed: parseInt(stats.closed) || 0
            },
            byPriority: {
                critical: parseInt(stats.critical) || 0,
                high: parseInt(stats.high) || 0,
                medium: parseInt(stats.medium) || 0,
                low: parseInt(stats.low) || 0
            }
        };
    }
};

module.exports = { TicketModel };
