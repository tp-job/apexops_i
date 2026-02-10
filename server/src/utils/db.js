// utils/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Singleton pool instance
let pool = null;

/**
 * Get or create database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
const getPool = () => {
    if (!pool) {
        pool = new Pool({
            user: process.env.PG_USER || 'postgres',
            host: process.env.PG_HOST || 'localhost',
            database: process.env.PG_DATABASE || 'apexops_db',
            password: process.env.PG_PASSWORD || 'postgres',
            port: parseInt(process.env.PG_PORT || '5432'),
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
            console.error('❌ Unexpected database pool error:', err);
        });
    }
    return pool;
};

/**
 * Execute a query using the pool
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await getPool().query(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
        }
        
        return result;
    } catch (err) {
        console.error('❌ Database query error:', err.message);
        throw err;
    }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
    return await getPool().connect();
};

/**
 * Close the pool connection
 */
const closePool = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database pool closed');
    }
};

/**
 * Add missing columns to tickets table (run once on startup)
 */
const ensureTicketColumns = async () => {
    try {
        await getPool().query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='assignee') THEN
                    ALTER TABLE tickets ADD COLUMN assignee TEXT;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='reporter') THEN
                    ALTER TABLE tickets ADD COLUMN reporter TEXT DEFAULT 'System';
                END IF;
            END $$;
        `);
    } catch (err) {
        console.warn('⚠️ Could not ensure ticket columns:', err.message);
    }
};

module.exports = {
    getPool,
    query,
    getClient,
    closePool,
    ensureTicketColumns,
    pool: getPool()
};
