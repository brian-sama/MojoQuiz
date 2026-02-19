/**
 * Migration Script: Authentication System
 * Adds users and auth_tokens tables, and links sessions to users.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateAuth() {
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

        console.log('📝 Creating users table...');
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(100),
        avatar_url TEXT,
        password_hash TEXT,
        auth_provider VARCHAR(20) DEFAULT 'email',
        google_id VARCHAR(100) UNIQUE,
        linkedin_id VARCHAR(100) UNIQUE,
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `;
        console.log('✅ users table created\n');

        console.log('📝 Creating auth_tokens table...');
        await sql`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        token_type VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
        console.log('✅ auth_tokens table created\n');

        console.log('📝 Modifying sessions table...');
        // Check if user_id column exists
        const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='sessions' AND column_name='user_id'
    `;

        if (columnExists.length === 0) {
            await sql`ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL`;
            console.log('✅ Added user_id to sessions\n');
        } else {
            console.log('ℹ️ user_id column already exists in sessions\n');
        }

        console.log('📊 Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_auth_tokens_code ON auth_tokens(code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`;
        console.log('✅ Indexes created\n');

        console.log('🎉 Migration complete!');

    } catch (error) {
        console.error('\n❌ Migration Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrateAuth();
