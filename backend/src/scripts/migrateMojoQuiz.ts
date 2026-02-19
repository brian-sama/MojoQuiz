/**
 * Migration Script: Social Auth & Admin Role
 * Adds linkedin_id and role columns to the users table.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateMojoQuiz() {
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

        console.log('📝 Adding linkedin_id column...');
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

        console.log('📝 Adding role column...');
        const roleExists = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role'
        `;
        if (roleExists.length === 0) {
            await sql`ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'`;
            console.log('✅ Added role to users');
        } else {
            console.log('ℹ️ role column already exists');
        }

        console.log('\n📊 Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
        console.log('✅ Indexes created\n');

        console.log('🎉 Migration complete!');

    } catch (error) {
        console.error('\n❌ Migration Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrateMojoQuiz();
