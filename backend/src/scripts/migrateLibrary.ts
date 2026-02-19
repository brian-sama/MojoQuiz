import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateLibrary() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await client.connect();

        console.log('📝 Adding library support to sessions table...');

        // Add is_deleted column for soft deletes
        await client.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false
    `);
        console.log('   ✓ Added is_deleted column');

        // Add tags column for grouping/templates
        await client.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'
    `);
        console.log('   ✓ Added tags column');

        // Add index for user sessions
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id) 
      WHERE is_deleted = false
    `);
        console.log('   ✓ Added index for user_id');

        console.log('\n🎉 Library migration complete!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrateLibrary();
