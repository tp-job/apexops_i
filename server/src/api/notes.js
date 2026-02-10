// api/notes.js - Notes API
const express = require('express');
const router = express.Router();
const { getPool } = require('../utils/db');
const { authenticate } = require('../middleware/auth');

const pool = getPool();

/**
 * Format database note to application note
 */
const formatNote = (note) => {
    if (!note) return null;
    return {
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        type: note.type,
        isPinned: note.is_pinned,
        color: note.color,
        tags: note.tags || [],
        imageUrl: note.image_url,
        linkUrl: note.link_url,
        checklistItems: note.checklist_items || [],
        quote: note.quote || {},
        createdAt: note.created_at,
        updatedAt: note.updated_at
    };
};

/**
 * GET /api/notes
 * Get all notes for current user
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC',
            [userId]
        );
        const notes = result.rows.map(formatNote);
        res.json(notes);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

/**
 * GET /api/notes/:id
 * Get a single note
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const note = formatNote(result.rows[0]);
        res.json(note);
    } catch (err) {
        console.error('Error fetching note:', err);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content, type, isPinned, color, tags, imageUrl, linkUrl, checklistItems, quote } = req.body;
        
        if (!title && !content) {
            return res.status(400).json({ error: 'Title or content is required' });
        }

        const result = await pool.query(
            `INSERT INTO notes (user_id, title, content, type, is_pinned, color, tags, image_url, link_url, checklist_items, quote)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                req.user.id,
                title || '',
                content || '',
                type || 'text',
                isPinned || false,
                color || null,
                JSON.stringify(tags || []),
                imageUrl || null,
                linkUrl || null,
                JSON.stringify(checklistItems || []),
                JSON.stringify(quote || {})
            ]
        );

        const note = formatNote(result.rows[0]);
        res.status(201).json(note);
    } catch (err) {
        console.error('Error creating note:', err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { title, content, type, isPinned, color, tags, imageUrl, linkUrl, checklistItems, quote } = req.body;
        
        const allowedFields = [
            'title', 'content', 'type', 'is_pinned', 'color',
            'tags', 'image_url', 'link_url', 'checklist_items', 'quote'
        ];

        const setClauses = [];
        const values = [req.params.id, req.user.id];
        let paramIndex = 3;

        // Map camelCase to snake_case and build update query
        const fieldMap = {
            title: 'title',
            content: 'content',
            type: 'type',
            isPinned: 'is_pinned',
            color: 'color',
            tags: 'tags',
            imageUrl: 'image_url',
            linkUrl: 'link_url',
            checklistItems: 'checklist_items',
            quote: 'quote'
        };

        for (const [camelKey, dbKey] of Object.entries(fieldMap)) {
            if (req.body.hasOwnProperty(camelKey)) {
                const value = req.body[camelKey];
                setClauses.push(`${dbKey} = $${paramIndex}`);
                
                // Stringify arrays and objects
                if (['tags', 'checklistItems', 'quote'].includes(camelKey)) {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await pool.query(
            `UPDATE notes 
             SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found or no changes made' });
        }

        const note = formatNote(result.rows[0]);
        res.json(note);
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        res.json({ message: 'Note deleted successfully', deleted: true, id: req.params.id });
    } catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

/**
 * GET /api/notes/stats/overview
 * Get note statistics for charts
 */
router.get('/stats/overview', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Total notes count
        const totalResult = await pool.query(
            'SELECT COUNT(*) as total FROM notes WHERE user_id = $1',
            [userId]
        );

        // Notes by type
        const typeResult = await pool.query(
            `SELECT type, COUNT(*) as count 
             FROM notes WHERE user_id = $1 
             GROUP BY type`,
            [userId]
        );

        // Pinned vs unpinned
        const pinnedResult = await pool.query(
            `SELECT is_pinned, COUNT(*) as count 
             FROM notes WHERE user_id = $1 
             GROUP BY is_pinned`,
            [userId]
        );

        // Notes created per day (last 7 days)
        const dailyResult = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM notes 
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [userId]
        );

        // Notes created per month (last 6 months)
        const monthlyResult = await pool.query(
            `SELECT 
                TO_CHAR(created_at, 'YYYY-MM') as month,
                TO_CHAR(created_at, 'Mon') as month_name,
                COUNT(*) as count 
             FROM notes 
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
             GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon')
             ORDER BY month ASC`,
            [userId]
        );

        // Notes by color
        const colorResult = await pool.query(
            `SELECT COALESCE(color, 'default') as color, COUNT(*) as count 
             FROM notes WHERE user_id = $1 
             GROUP BY color`,
            [userId]
        );

        // Recent activity (last 10 notes)
        const recentResult = await pool.query(
            `SELECT id, title, type, created_at, updated_at 
             FROM notes 
             WHERE user_id = $1 
             ORDER BY updated_at DESC 
             LIMIT 10`,
            [userId]
        );

        // Format type stats
        const typeStats = {
            text: 0,
            image: 0,
            list: 0,
            link: 0
        };
        typeResult.rows.forEach(row => {
            typeStats[row.type] = parseInt(row.count);
        });

        // Format pinned stats
        let pinnedCount = 0;
        let unpinnedCount = 0;
        pinnedResult.rows.forEach(row => {
            if (row.is_pinned) {
                pinnedCount = parseInt(row.count);
            } else {
                unpinnedCount = parseInt(row.count);
            }
        });

        // Fill in missing days for daily stats
        const dailyStats = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const found = dailyResult.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
            dailyStats.push({
                date: dateStr,
                day: dayName,
                count: found ? parseInt(found.count) : 0
            });
        }

        // Format monthly stats
        const monthlyStats = monthlyResult.rows.map(row => ({
            month: row.month,
            monthName: row.month_name,
            count: parseInt(row.count)
        }));

        res.json({
            total: parseInt(totalResult.rows[0].total),
            byType: typeStats,
            pinned: {
                pinned: pinnedCount,
                unpinned: unpinnedCount
            },
            daily: dailyStats,
            monthly: monthlyStats,
            byColor: colorResult.rows.map(r => ({
                color: r.color,
                count: parseInt(r.count)
            })),
            recentActivity: recentResult.rows.map(r => ({
                id: r.id,
                title: r.title,
                type: r.type,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }))
        });
    } catch (err) {
        console.error('Error fetching note stats:', err);
        res.status(500).json({ error: 'Failed to fetch note statistics' });
    }
});

/**
 * GET /api/notes/calendar/:year/:month
 * Get notes for calendar view (by month)
 */
router.get('/calendar/:year/:month', authenticate, async (req, res) => {
    try {
        const { year, month } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, title, type, color, created_at, updated_at
             FROM notes 
             WHERE user_id = $1 
               AND EXTRACT(YEAR FROM created_at) = $2
               AND EXTRACT(MONTH FROM created_at) = $3
             ORDER BY created_at ASC`,
            [userId, parseInt(year), parseInt(month)]
        );

        // Group notes by day
        const notesByDay = {};
        result.rows.forEach(note => {
            const day = new Date(note.created_at).getDate();
            if (!notesByDay[day]) {
                notesByDay[day] = [];
            }
            notesByDay[day].push({
                id: note.id,
                title: note.title,
                type: note.type,
                color: note.color,
                createdAt: note.created_at,
                updatedAt: note.updated_at
            });
        });

        res.json({
            year: parseInt(year),
            month: parseInt(month),
            notesByDay,
            totalNotes: result.rows.length
        });
    } catch (err) {
        console.error('Error fetching calendar notes:', err);
        res.status(500).json({ error: 'Failed to fetch calendar notes' });
    }
});

module.exports = router;

