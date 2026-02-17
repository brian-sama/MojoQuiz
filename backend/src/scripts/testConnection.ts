/**
 * Simple Connection Test using Neon Serverless Driver
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        return;
    }

    console.log('DATABASE_URL:', connectionString.replace(/:[^:@]+@/, ':****@'));

    const sql = neon(connectionString);

    try {
        console.log('\n🔌 Testing connection...');

        const result = await sql`SELECT NOW() as time`;
        console.log('✅ Connected!');
        console.log('⏰ Server time:', result[0].time);

        const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      LIMIT 10
    `;
        console.log('📊 Existing tables:', tables.map((r: any) => r.table_name).join(', ') || '(none)');

        console.log('\n✅ Connection test passed!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testConnection();
