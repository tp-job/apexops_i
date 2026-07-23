const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'db_diagnostic.log');
const log = (msg) => {
    const text = `${new Date().toISOString()} - ${msg}\n`;
    fs.appendFileSync(logFile, text);
    console.log(msg);
};

log('--- DB DIAGNOSTIC STARTED ---');
try {
    const dotenvPath = path.join(__dirname, '..', '.env');
    log(`Loading dotenv from: ${dotenvPath}`);
    require('dotenv').config({ path: dotenvPath });

    const { Pool } = require('pg');
    const pool = new Pool({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'apexops_db',
        password: process.env.PG_PASSWORD || 'postgres',
        port: parseInt(process.env.PG_PORT || '5432'),
        connectionTimeoutMillis: 5000,
    });

    log('Connecting to PostgreSQL...');
    pool.connect().then(async (client) => {
        log('✅ Connected successfully!');

        try {
            log('Creating notes table...');
            await client.query(`
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
                )
            `);
            log('✅ notes table verified');

            log('Creating indexes...');
            await client.query('CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned)');
            log('✅ Indexes verified');

            log('Creating trigger...');
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notes_updated_at') THEN
                        CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
                        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                    END IF;
                END $$;
            `);
            log('✅ Trigger verified');

        } catch (dbErr) {
            log(`❌ DB ERROR: ${dbErr.message}`);
        } finally {
            client.release();
            await pool.end();
            log('--- DB DIAGNOSTIC COMPLETED ---');
            process.exit(0);
        }
    }).catch(connErr => {
        log(`❌ CONNECTION ERROR: ${connErr.message}`);
        process.exit(1);
    });

} catch (err) {
    log(`❌ FATAL ERROR: ${err.message}`);
    process.exit(1);
}
