const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logFile = path.join(__dirname, 'conn_test.log');
const log = (msg) => { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); console.log(msg); };

log('Starting connection test...');
log(`User: ${process.env.PG_USER}`);
log(`Host: ${process.env.PG_HOST}`);
log(`DB: ${process.env.PG_DATABASE}`);
log(`Port: ${process.env.PG_PORT}`);

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT || '5432'),
    connectionTimeoutMillis: 5000,
});

pool.connect().then(client => {
    log('✅ SUCCESS: Connected to database');
    client.release();
    pool.end();
}).catch(err => {
    log(`❌ ERROR: ${err.message}`);
    log(`Full Error: ${JSON.stringify(err)}`);
    pool.end();
});
