const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env');
console.log('Loading dotenv from:', dotenvPath);
require('dotenv').config({ path: dotenvPath });

const { Pool } = require('pg');

const config = {
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'apexops_db',
    password: process.env.PG_PASSWORD || 'postgres',
    port: parseInt(process.env.PG_PORT || '5432'),
    connectionTimeoutMillis: 2000,
};

console.log('PG Config:', JSON.stringify({ ...config, password: '***' }, null, 2));

const pool = new Pool(config);

const run = async () => {
    try {
        console.log('Connecting to pool...');
        const client = await pool.connect();
        console.log('✅ Connected!');

        console.log('Checking for notes table...');
        const res = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'notes'");
        if (res.rowCount > 0) {
            console.log('Notes table already exists.');
        } else {
            console.log('Notes table missing. Creating...');
            await client.query(`
                CREATE TABLE notes (
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
            console.log('✅ notes table created');
        }

        client.release();
    } catch (err) {
        console.error('❌ DB FIX ERROR:', err);
    } finally {
        await pool.end();
        console.log('Pool closed.');
        process.exit();
    }
};

run();
