const { query } = require('../utils/db');

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

const NoteModel = {
    /**
     * Get all notes for a user
     */
    async getAllByUser(userId) {
        const result = await query(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC',
            [userId]
        );
        return result.rows.map(formatNote);
    },

    /**
     * Get a single note by ID
     */
    async getById(id, userId) {
        const result = await query(
            'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return formatNote(result.rows[0]);
    },

    /**
     * Create a new note
     */
    async create(noteData) {
        const {
            userId,
            title = '',
            content = '',
            type = 'text',
            isPinned = false,
            color = null,
            tags = [],
            imageUrl = null,
            linkUrl = null,
            checklistItems = [],
            quote = {}
        } = noteData;

        const result = await query(
            `INSERT INTO notes (user_id, title, content, type, is_pinned, color, tags, image_url, link_url, checklist_items, quote)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                userId,
                title,
                content,
                type,
                isPinned,
                color,
                JSON.stringify(tags),
                imageUrl,
                linkUrl,
                JSON.stringify(checklistItems),
                JSON.stringify(quote)
            ]
        );

        return formatNote(result.rows[0]);
    },

    /**
     * Update an existing note
     */
    async update(id, userId, updateData) {
        const allowedFields = [
            'title', 'content', 'type', 'is_pinned', 'color',
            'tags', 'image_url', 'link_url', 'checklist_items', 'quote'
        ];

        const setClauses = [];
        const values = [id, userId];
        let paramIndex = 3;

        for (const [key, value] of Object.entries(updateData)) {
            // Convert camelCase to snake_case for DB
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            if (allowedFields.includes(dbKey)) {
                setClauses.push(`${dbKey} = $${paramIndex}`);
                values.push(typeof value === 'object' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) return null;

        const result = await query(
            `UPDATE notes 
             SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            values
        );

        return formatNote(result.rows[0]);
    },

    /**
     * Delete a note
     */
    async delete(id, userId) {
        const result = await query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rowCount > 0;
    }
};

module.exports = NoteModel;
