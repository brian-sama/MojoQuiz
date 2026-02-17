-- =====================================================
-- Real-Time Audience Engagement Platform Database Schema
-- Supports: Polls, Word Cloud, Open-ended, Scale, Quiz
-- =====================================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- CORE TABLES
-- =====================================================
-- Sessions: Main container for presenter sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    join_code VARCHAR(6) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    presenter_id VARCHAR(100) NOT NULL,
    -- 'engagement' = Mentimeter-style, 'quiz' = Kahoot-style, 'mixed' = both
    mode VARCHAR(20) NOT NULL DEFAULT 'mixed',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active', 'paused', 'ended'
    settings JSONB DEFAULT '{}',
    current_question_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);
-- Participants: Users who join a session
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    cookie_id VARCHAR(100) NOT NULL,
    -- Persistent browser identifier
    socket_id VARCHAR(100),
    -- Current WebSocket connection
    nickname VARCHAR(50),
    avatar_color VARCHAR(7) DEFAULT '#3B82F6',
    -- Hex color for avatar
    total_score INTEGER DEFAULT 0,
    -- Quiz mode cumulative score
    is_connected BOOLEAN DEFAULT true,
    is_removed BOOLEAN DEFAULT false,
    -- Presenter removed this player
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, cookie_id) -- One participant per browser per session
);
-- Questions: All question types stored here
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    -- Question type: 'poll', 'word_cloud', 'open_ended', 'scale', 
    -- 'quiz_mc', 'quiz_tf', 'quiz_order', 'quiz_slider', 'quiz_typed'
    question_type VARCHAR(30) NOT NULL,
    question_text TEXT NOT NULL,
    -- For polls/quiz: array of option objects
    options JSONB,
    -- Question-specific settings
    settings JSONB DEFAULT '{}',
    -- Quiz mode: correct answer(s)
    correct_answer JSONB,
    -- Quiz mode: time limit in seconds
    time_limit INTEGER,
    -- Ordering within session
    display_order INTEGER NOT NULL,
    -- State management
    is_active BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    -- Voting closed
    is_results_visible BOOLEAN DEFAULT false,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- RESPONSE TABLES
-- =====================================================
-- Responses: Generic response storage for most question types
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    -- Flexible JSON storage for any response type
    response_data JSONB NOT NULL,
    -- Quiz scoring
    is_correct BOOLEAN,
    score INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    -- Time taken to answer
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate submissions per question
    UNIQUE(question_id, participant_id)
);
-- Word Submissions: Separate table for word cloud aggregation
CREATE TABLE word_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    original_word VARCHAR(50) NOT NULL,
    normalized_word VARCHAR(50) NOT NULL,
    -- lowercase, trimmed
    is_filtered BOOLEAN DEFAULT false,
    -- Caught by profanity filter
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Text Responses: Open-ended with moderation
CREATE TABLE text_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- Moderation status: 'pending', 'approved', 'hidden', 'highlighted'
    moderation_status VARCHAR(20) DEFAULT 'pending',
    moderated_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, participant_id)
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_sessions_status ON sessions(status)
WHERE status = 'active';
CREATE INDEX idx_sessions_expires ON sessions(expires_at)
WHERE status = 'active';
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_cookie ON participants(session_id, cookie_id);
CREATE INDEX idx_participants_socket ON participants(socket_id)
WHERE socket_id IS NOT NULL;
CREATE INDEX idx_participants_connected ON participants(session_id, is_connected)
WHERE is_connected = true;
CREATE INDEX idx_questions_session ON questions(session_id);
CREATE INDEX idx_questions_active ON questions(session_id, is_active)
WHERE is_active = true;
CREATE INDEX idx_questions_order ON questions(session_id, display_order);
CREATE INDEX idx_responses_question ON responses(question_id);
CREATE INDEX idx_responses_participant ON responses(participant_id);
CREATE INDEX idx_word_submissions_question ON word_submissions(question_id);
CREATE INDEX idx_word_submissions_normalized ON word_submissions(question_id, normalized_word);
CREATE INDEX idx_text_responses_question ON text_responses(question_id);
CREATE INDEX idx_text_responses_status ON text_responses(question_id, moderation_status);
-- =====================================================
-- VIEWS FOR AGGREGATION
-- =====================================================
-- Word cloud aggregation view
CREATE VIEW word_cloud_aggregates AS
SELECT question_id,
    normalized_word as word,
    COUNT(*) as weight,
    MIN(submitted_at) as first_submitted
FROM word_submissions
WHERE is_filtered = false
GROUP BY question_id,
    normalized_word
ORDER BY weight DESC;
-- Poll results aggregation view
CREATE VIEW poll_results AS
SELECT q.id as question_id,
    q.session_id,
    COUNT(r.id) as total_votes,
    jsonb_object_agg(
        COALESCE(r.response_data->>'option_index', 'null'),
        COUNT(*)
    ) as vote_distribution
FROM questions q
    LEFT JOIN responses r ON r.question_id = q.id
WHERE q.question_type IN ('poll', 'quiz_mc', 'quiz_tf')
GROUP BY q.id,
    q.session_id;
-- Leaderboard view
CREATE VIEW session_leaderboard AS
SELECT session_id,
    id as participant_id,
    nickname,
    total_score,
    RANK() OVER (
        PARTITION BY session_id
        ORDER BY total_score DESC
    ) as rank
FROM participants
WHERE is_removed = false
    AND nickname IS NOT NULL
ORDER BY session_id,
    total_score DESC;
-- Scale question statistics view
CREATE VIEW scale_statistics AS
SELECT question_id,
    COUNT(*) as total_responses,
    AVG((response_data->>'value')::numeric) as average_value,
    MIN((response_data->>'value')::numeric) as min_value,
    MAX((response_data->>'value')::numeric) as max_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (response_data->>'value')::numeric
    ) as median_value
FROM responses r
    JOIN questions q ON q.id = r.question_id
WHERE q.question_type = 'scale'
GROUP BY question_id;
-- =====================================================
-- FUNCTIONS
-- =====================================================
-- Auto-update last_seen_at on participant activity
CREATE OR REPLACE FUNCTION update_participant_last_seen() RETURNS TRIGGER AS $$ BEGIN NEW.last_seen_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_participant_last_seen BEFORE
UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_participant_last_seen();
-- Expire old sessions
CREATE OR REPLACE FUNCTION expire_old_sessions() RETURNS INTEGER AS $$
DECLARE expired_count INTEGER;
BEGIN
UPDATE sessions
SET status = 'ended',
    ended_at = CURRENT_TIMESTAMP
WHERE status = 'active'
    AND expires_at < CURRENT_TIMESTAMP;
GET DIAGNOSTICS expired_count = ROW_COUNT;
RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
-- Calculate participant rank in session
CREATE OR REPLACE FUNCTION get_participant_rank(p_session_id UUID, p_participant_id UUID) RETURNS INTEGER AS $$
DECLARE participant_rank INTEGER;
BEGIN
SELECT rank INTO participant_rank
FROM session_leaderboard
WHERE session_id = p_session_id
    AND participant_id = p_participant_id;
RETURN COALESCE(participant_rank, 0);
END;
$$ LANGUAGE plpgsql;
-- Get word cloud data for a question
CREATE OR REPLACE FUNCTION get_word_cloud(p_question_id UUID, p_limit INTEGER DEFAULT 100) RETURNS TABLE(word VARCHAR, weight BIGINT) AS $$ BEGIN RETURN QUERY
SELECT wca.word,
    wca.weight
FROM word_cloud_aggregates wca
WHERE wca.question_id = p_question_id
ORDER BY wca.weight DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;