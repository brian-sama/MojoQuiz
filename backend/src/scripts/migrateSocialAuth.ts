/**
 * Migration Script: Social Authentication
 * Adds linkedin_id and microsoft_id to the users table.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateSocialAuth() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    async function sql(strings: TemplateStringsArray, ...values: any[]) {
        const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
        const result = await client.query(text, values);
        return result.rows;
    }

    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await client.connect();
        console.log('✅ Connected!\n');

        console.log('📝 Adding social ID columns to users table...');

        // Add linkedin_id column
        const linkedinExists = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='linkedin_id'
        `;
        if (linkedinExists.length === 0) {
            await sql`ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(100) UNIQUE`;
            console.log('✅ Added linkedin_id to users');
        } else {
            console.log('ℹ️ linkedin_id column already exists');
        }

        // Add microsoft_id column
        const microsoftExists = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='microsoft_id'
        `;
        if (microsoftExists.length === 0) {
            await sql`ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(100) UNIQUE`;
            console.log('✅ Added microsoft_id to users');
        } else {
            console.log('ℹ️ microsoft_id column already exists');
        }

        console.log('\n📊 Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id)`;
        console.log('✅ Indexes created\n');

        console.log('🎉 Migration complete!');

    } catch (error) {
        console.error('\n❌ Migration Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrateSocialAuth();
