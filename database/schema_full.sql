-- MojoQuiz Full Database Schema
-- Optimized for PostgreSQL 14+
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    join_code VARCHAR(6) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    presenter_id VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'mixed',
    -- 'engagement', 'quiz', 'mixed'
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active', 'paused', 'ended'
    settings JSONB DEFAULT '{}',
    current_question_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);
-- 2. Participants Table
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    cookie_id VARCHAR(100) NOT NULL,
    socket_id VARCHAR(100),
    nickname VARCHAR(100),
    avatar_color VARCHAR(20) DEFAULT '#3b82f6',
    total_score INTEGER DEFAULT 0,
    is_connected BOOLEAN DEFAULT true,
    is_removed BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, cookie_id)
);
-- 3. Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB,
    -- Array of objects: {id, text, color, imageUrl}
    settings JSONB DEFAULT '{}',
    -- {points, allow_multiple, min_value, max_value, etc.}
    correct_answer JSONB,
    -- Can be index, value, or string
    time_limit INTEGER,
    -- In seconds
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_results_visible BOOLEAN DEFAULT false,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 4. Responses Table (Polls, Scales, Quizzes)
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
);
-- 5. Word Submissions (Word Cloud specific)
CREATE TABLE word_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    original_word VARCHAR(50) NOT NULL,
    normalized_word VARCHAR(50) NOT NULL,
    is_filtered BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 6. Text Responses (Open Ended specific with Moderation)
CREATE TABLE text_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    moderation_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'approved', 'hidden', 'highlighted'
    moderated_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Performance Indexes
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_participants_session_cookie ON participants(session_id, cookie_id);
CREATE INDEX idx_participants_socket ON participants(socket_id)
WHERE socket_id IS NOT NULL;
CREATE INDEX idx_questions_session ON questions(session_id);
CREATE INDEX idx_responses_question ON responses(question_id);
CREATE INDEX idx_text_responses_moderation ON text_responses(question_id, moderation_status);
-- Auto-update last_seen_at Trigger
CREATE OR REPLACE FUNCTION update_participant_last_seen() RETURNS TRIGGER AS $$ BEGIN NEW.last_seen_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_participant_last_seen_trigger BEFORE
UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_participant_last_seen();