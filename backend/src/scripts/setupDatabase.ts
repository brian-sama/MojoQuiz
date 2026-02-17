/**
 * Database Setup Script - Creates all tables directly
 * Uses tagged template literals for reliable execution
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  /**
   * Tag function to run queries with param substitution
   */
  async function sql(strings: TemplateStringsArray, ...values: any[]) {
    const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
    const result = await client.query(text, values);
    return result.rows;
  }

  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    await client.connect();
    const timeResult = await sql`SELECT NOW() as time`;
    console.log('✅ Connected! Server time:', timeResult[0].time);

    console.log('');

    // ============================================
    // STEP 1: Drop existing tables
    // ============================================
    console.log('🗑️  Dropping existing tables if any...');

    // Drop in reverse dependency order
    await sql`DROP TABLE IF EXISTS text_responses CASCADE`;
    await sql`DROP TABLE IF EXISTS word_submissions CASCADE`;
    await sql`DROP TABLE IF EXISTS responses CASCADE`;
    await sql`DROP TABLE IF EXISTS questions CASCADE`;
    await sql`DROP TABLE IF EXISTS participants CASCADE`;
    await sql`DROP TABLE IF EXISTS sessions CASCADE`;

    // Drop views and functions
    await sql`DROP VIEW IF EXISTS scale_statistics CASCADE`;
    await sql`DROP VIEW IF EXISTS session_leaderboard CASCADE`;
    await sql`DROP VIEW IF EXISTS poll_results CASCADE`;
    await sql`DROP VIEW IF EXISTS word_cloud_aggregates CASCADE`;
    await sql`DROP FUNCTION IF EXISTS get_word_cloud CASCADE`;
    await sql`DROP FUNCTION IF EXISTS get_participant_rank CASCADE`;
    await sql`DROP FUNCTION IF EXISTS expire_old_sessions CASCADE`;
    await sql`DROP FUNCTION IF EXISTS update_participant_last_seen CASCADE`;

    console.log('✅ Existing objects dropped\n');

    // ============================================
    // STEP 2: Enable UUID extension
    // ============================================
    console.log('📦 Enabling UUID extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension enabled\n');

    // ============================================
    // STEP 3: Create tables
    // ============================================
    console.log('📝 Creating tables...');

    // Sessions table
    await sql`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        join_code VARCHAR(6) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        presenter_id VARCHAR(100) NOT NULL,
        mode VARCHAR(20) NOT NULL DEFAULT 'mixed',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        current_question_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        ended_at TIMESTAMP WITH TIME ZONE
      )
    `;
    console.log('   ✓ sessions');

    // Participants table
    await sql`
      CREATE TABLE participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        cookie_id VARCHAR(100) NOT NULL,
        socket_id VARCHAR(100),
        nickname VARCHAR(50),
        avatar_color VARCHAR(7) DEFAULT '#3B82F6',
        total_score INTEGER DEFAULT 0,
        is_connected BOOLEAN DEFAULT true,
        is_removed BOOLEAN DEFAULT false,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, cookie_id)
      )
    `;
    console.log('   ✓ participants');

    // Questions table
    await sql`
      CREATE TABLE questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_type VARCHAR(30) NOT NULL,
        question_text TEXT NOT NULL,
        options JSONB,
        settings JSONB DEFAULT '{}',
        correct_answer JSONB,
        time_limit INTEGER,
        display_order INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT false,
        is_locked BOOLEAN DEFAULT false,
        is_results_visible BOOLEAN DEFAULT false,
        activated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✓ questions');

    // Responses table
    await sql`
      CREATE TABLE responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        response_data JSONB NOT NULL,
        is_correct BOOLEAN,
        score INTEGER DEFAULT 0,
        response_time_ms INTEGER,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(question_id, participant_id)
      )
    `;
    console.log('   ✓ responses');

    // Word submissions table
    await sql`
      CREATE TABLE word_submissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        original_word VARCHAR(50) NOT NULL,
        normalized_word VARCHAR(50) NOT NULL,
        is_filtered BOOLEAN DEFAULT false,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('   ✓ word_submissions');

    // Text responses table
    await sql`
      CREATE TABLE text_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        moderation_status VARCHAR(20) DEFAULT 'pending',
        moderated_at TIMESTAMP WITH TIME ZONE,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(question_id, participant_id)
      )
    `;
    console.log('   ✓ text_responses');

    console.log('\n✅ All tables created\n');

    // ============================================
    // STEP 4: Create indexes
    // ============================================
    console.log('📊 Creating indexes...');

    await sql`CREATE INDEX idx_sessions_join_code ON sessions(join_code)`;
    await sql`CREATE INDEX idx_sessions_status ON sessions(status) WHERE status = 'active'`;
    await sql`CREATE INDEX idx_participants_session ON participants(session_id)`;
    await sql`CREATE INDEX idx_participants_socket ON participants(socket_id) WHERE socket_id IS NOT NULL`;
    await sql`CREATE INDEX idx_questions_session ON questions(session_id)`;
    await sql`CREATE INDEX idx_questions_active ON questions(session_id, is_active) WHERE is_active = true`;
    await sql`CREATE INDEX idx_responses_question ON responses(question_id)`;
    await sql`CREATE INDEX idx_word_submissions_question ON word_submissions(question_id)`;
    await sql`CREATE INDEX idx_text_responses_question ON text_responses(question_id)`;

    console.log('✅ Indexes created\n');

    // ============================================
    // STEP 5: Verify tables
    // ============================================
    console.log('🔍 Verifying tables...');

    const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('\n📊 Created tables:');
    tables.forEach((row: any) => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('\n🎉 Database setup complete!');

  } catch (error) {
    console.error('\n❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
