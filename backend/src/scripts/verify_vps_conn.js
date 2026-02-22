import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Client } = pg;

async function test() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not defined in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));
        await client.connect();
        console.log('✅ Successfully connected to VPS database!');

        const pathResult = await client.query('SHOW search_path');
        console.log('🔍 Current search_path:', pathResult.rows[0].search_path);

        try {
            const userCount = await client.query('SELECT COUNT(*) FROM users');
            console.log('✅ Found users table! Count:', userCount.rows[0].count);
        } catch (e) {
            console.error('❌ Failed to query users table:', e.message);
        }

        const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
        console.log('📊 Tables found:', tables.rows.map(r => r.table_name).join(', ') || '(none)');

        if (tables.rows.length === 0) {
            console.log('⚠️ DATABASE IS EMPTY! No tables found.');
        }

        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

test();
