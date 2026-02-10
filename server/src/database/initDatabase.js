// database/initDatabase.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Initialize database with schema
 * @param {Pool} pool - PostgreSQL connection pool
 */
const initDatabase = async (pool) => {
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        client.release();

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        try {
            await pool.query(schemaSQL);
            console.log('✅ Database schema initialized successfully');
        } catch (err) {
            console.warn('⚠️  Full schema execution failed, trying individual statements...');
            const statements = schemaSQL
                .split(/;(?![^$]*\$\$)/)
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                try {
                    await pool.query(statement);
                } catch (stmtErr) {
                    if (!stmtErr.message.includes('already exists') &&
                        !stmtErr.message.includes('duplicate') &&
                        !stmtErr.message.includes('does not exist')) {
                        console.warn('⚠️  Schema statement warning:', stmtErr.message);
                    }
                }
            }
            console.log('✅ Database schema initialized successfully');
        }

        // Dedicated check for notes table (belt and braces)
        await ensureNotesTable(pool);

        // Create default admin user if not exists
        await createDefaultAdmin(pool);

        // Clean up expired refresh tokens
        await cleanupExpiredTokens(pool);

    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        throw err;
    }
};

/**
 * Ensure notes table exists
 */
const ensureNotesTable = async (pool) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content TEXT,
                type TEXT DEFAULT 'text',
                is_pinned BOOLEAN DEFAULT false,
                color TEXT,
                tags JSONB DEFAULT '[]',
                image_url TEXT,
                link_url TEXT,
                checklist_items JSONB DEFAULT '[]',
                quote JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Notes table verified');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned)');

        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notes_updated_at') THEN
                    CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$;
        `);
    } catch (err) {
        console.warn('⚠️ Could not ensure notes table:', err.message);
    }
};

/**
 * Create default admin user
 */
const createDefaultAdmin = async (pool) => {
    try {
        const bcrypt = require('bcryptjs');
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
        const adminEmail = process.env.ADMIN_EMAIL || `${adminUsername}@apexops.com`;

        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [adminEmail]
        );

        if (result.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            await pool.query(
                `INSERT INTO users (first_name, last_name, email, password, role, email_verified)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [adminUsername, 'Admin', adminEmail, hashedPassword, 'admin', true]
            );
            console.log('✅ Default admin user created');
        }
    } catch (err) {
        console.error('⚠️ Error creating default admin:', err.message);
    }
};

/**
 * Clean up expired refresh tokens
 */
const cleanupExpiredTokens = async (pool) => {
    try {
        await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    } catch (err) {
        console.warn('⚠️ Error cleaning up expired tokens:', err.message);
    }
};

module.exports = { initDatabase, cleanupExpiredTokens };
