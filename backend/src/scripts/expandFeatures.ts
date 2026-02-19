/**
 * Migration: Expand Features
 * Adds brainstorming tables, folders, and library management fields.
 * Also adds NPS, brainstorm, and quiz_audio question type support.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function expandFeatures() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!\n');

        // ============================================
        // STEP 1: Create folders table
        // ============================================
        console.log('Creating folders table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id)`);
        console.log('   folders table created');

        // ============================================
        // STEP 2: Add library management columns to sessions
        // ============================================
        console.log('Adding library columns to sessions...');

        // folder_id
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL
    `);

        // is_favorite
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false
    `);

        // visibility: private, public, workspace
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private'
    `);

        // is_deleted (may already exist)
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false
    `);

        // user_id (may already exist from prior migration)
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);

        // description for richer presentation cards
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
    `);

        // thumbnail for visual preview
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS thumbnail_url TEXT
    `);

        // play_count for tracking usage
        await client.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0
    `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_folder ON sessions(folder_id) WHERE folder_id IS NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id) WHERE user_id IS NOT NULL`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_favorite ON sessions(user_id, is_favorite) WHERE is_favorite = true`);
        console.log('   sessions columns added');

        // ============================================
        // STEP 3: Add audio_url to questions
        // ============================================
        console.log('Adding audio_url to questions...');
        await client.query(`
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url TEXT
    `);
        await client.query(`
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS media_url TEXT
    `);
        console.log('   questions columns added');

        // ============================================
        // STEP 4: Create brainstorm_ideas table
        // ============================================
        console.log('Creating brainstorm tables...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS brainstorm_ideas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        group_label VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_question ON brainstorm_ideas(question_id)`);
        console.log('   brainstorm_ideas table created');

        // ============================================
        // STEP 5: Create brainstorm_votes table
        // ============================================
        await client.query(`
      CREATE TABLE IF NOT EXISTS brainstorm_votes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        idea_id UUID NOT NULL REFERENCES brainstorm_ideas(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(idea_id, participant_id)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_brainstorm_votes_idea ON brainstorm_votes(idea_id)`);
        console.log('   brainstorm_votes table created');

        // ============================================
        // STEP 6: Verify
        // ============================================
        console.log('\nVerifying tables...');
        const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

        console.log('\nAll tables:');
        tables.rows.forEach((row: any) => {
            console.log(`   - ${row.tablename}`);
        });

        console.log('\nMigration complete!');

    } catch (error) {
        console.error('\nMigration error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

expandFeatures();
