// models/LogModel.js
const { query } = require('../utils/db');

/**
 * Helper: Format log for response
 */
const formatLog = (row) => {
    if (!row) return null;
    return {
        id: row.id.toString(),
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        level: row.level || 'info',
        message: row.message || '',
        source: row.source || 'unknown',
        stack: row.stack || undefined
    };
};

const LogModel = {
    /**
     * Get all logs with optional filtering
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} List of logs
     */
    async getAll(options = {}) {
        const { level, source, limit = 100, offset = 0 } = options;
        
        let sql = 'SELECT * FROM logs WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (level) {
            sql += ` AND level = $${paramIndex}`;
            params.push(level);
            paramIndex++;
        }

        if (source) {
            sql += ` AND source ILIKE $${paramIndex}`;
            params.push(`%${source}%`);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows.map(formatLog);
    },

    /**
     * Get log by ID
     * @param {string|number} id - Log ID
     * @returns {Promise<Object|null>} Log object or null
     */
    async getById(id) {
        const result = await query('SELECT * FROM logs WHERE id = $1', [id]);
        return result.rows.length > 0 ? formatLog(result.rows[0]) : null;
    },

    /**
     * Create new log entry
     * @param {Object} logData - Log data
     * @returns {Promise<Object>} Created log
     */
    async create(logData) {
        const { level = 'info', message, source = 'unknown', stack = null } = logData;

        const result = await query(
            `INSERT INTO logs (level, message, source, stack)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [level, message, source, stack]
        );

        return formatLog(result.rows[0]);
    },

    /**
     * Create multiple log entries
     * @param {Array} logs - Array of log data
     * @returns {Promise<Array>} Created logs
     */
    async createBatch(logs) {
        const results = [];
        for (const log of logs) {
            if (log.message) {
                const created = await this.create(log);
                results.push(created);
            }
        }
        return results;
    },

    /**
     * Delete log
     * @param {string|number} id - Log ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        const result = await query('DELETE FROM logs WHERE id = $1', [id]);
        return result.rowCount > 0;
    },

    /**
     * Delete logs with filters
     * @param {Object} options - Filter options
     * @returns {Promise<number>} Number of deleted logs
     */
    async deleteMany(options = {}) {
        const { level, olderThan } = options;
        
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

        const result = await query(sql, params);
        return result.rowCount;
    },

    /**
     * Get log statistics
     * @returns {Promise<Object>} Stats object
     */
    async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE level = 'error') as errors,
                COUNT(*) FILTER (WHERE level = 'warning') as warnings,
                COUNT(*) FILTER (WHERE level = 'info') as info,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24_hours,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
            FROM logs
        `);

        const stats = result.rows[0];
        return {
            total: parseInt(stats.total) || 0,
            byLevel: {
                errors: parseInt(stats.errors) || 0,
                warnings: parseInt(stats.warnings) || 0,
                info: parseInt(stats.info) || 0
            },
            last24Hours: parseInt(stats.last_24_hours) || 0,
            last7Days: parseInt(stats.last_7_days) || 0
        };
    }
};

module.exports = { LogModel };
