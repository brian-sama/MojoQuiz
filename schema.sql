-- Real-Time Session System Database Schema
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    join_code VARCHAR(6) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    presenter_id VARCHAR(100) NOT NULL, -- Could be email or UUID
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'ended'
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'poll', 'rating', 'multiple_choice'
    options JSONB, -- Array of answer options
    is_active BOOLEAN DEFAULT false,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Participants table (tracks by socket + cookie)
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_cookie VARCHAR(100) NOT NULL, -- Unique cookie identifier
    socket_id VARCHAR(100), -- Current socket connection ID
    nickname VARCHAR(100),
    is_connected BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, participant_cookie) -- Prevent duplicate participants
);

-- Votes table (prevents duplicate voting)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    vote_data JSONB NOT NULL, -- The actual vote/answer
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Composite unique constraint prevents duplicate votes
    UNIQUE(question_id, participant_id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_sessions_status_expires ON sessions(status, expires_at);
CREATE INDEX idx_questions_session_active ON questions(session_id, is_active);
CREATE INDEX idx_participants_session_cookie ON participants(session_id, participant_cookie);
CREATE INDEX idx_participants_socket ON participants(socket_id) WHERE socket_id IS NOT NULL;
CREATE INDEX idx_votes_question ON votes(question_id);
CREATE INDEX idx_votes_participant ON votes(participant_id);

-- Auto-update last_seen_at on participant activity
CREATE OR REPLACE FUNCTION update_participant_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participant_last_seen_trigger
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_last_seen();

-- View for session statistics
CREATE VIEW session_stats AS
SELECT 
    s.id,
    s.join_code,
    s.title,
    s.status,
    COUNT(DISTINCT p.id) FILTER (WHERE p.is_connected = true) as active_participants,
    COUNT(DISTINCT p.id) as total_participants,
    COUNT(DISTINCT q.id) as total_questions,
    COUNT(DISTINCT v.id) as total_votes,
    s.created_at,
    s.expires_at
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN questions q ON q.session_id = s.id
LEFT JOIN votes v ON v.session_id = s.id
GROUP BY s.id, s.join_code, s.title, s.status, s.created_at, s.expires_at;

-- View for vote results aggregation
CREATE VIEW vote_results AS
SELECT 
    q.id as question_id,
    q.session_id,
    q.question_text,
    q.question_type,
    COUNT(v.id) as total_votes,
    jsonb_agg(
        jsonb_build_object(
            'vote_data', v.vote_data,
            'voted_at', v.voted_at
        ) ORDER BY v.voted_at
    ) as all_votes
FROM questions q
LEFT JOIN votes v ON v.question_id = q.id
GROUP BY q.id, q.session_id, q.question_text, q.question_type;

-- Function to expire old sessions (run periodically)
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS TABLE(expired_count INTEGER) AS $$
BEGIN
    UPDATE sessions 
    SET status = 'ended', ended_at = CURRENT_TIMESTAMP
    WHERE status = 'active' 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up disconnected participants (run periodically)
CREATE OR REPLACE FUNCTION cleanup_disconnected_participants()
RETURNS TABLE(cleaned_count INTEGER) AS $$
BEGIN
    DELETE FROM participants
    WHERE is_connected = false
    AND last_seen_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old ended sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_old INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count INTEGER) AS $$
BEGIN
    DELETE FROM sessions
    WHERE status = 'ended'
    AND ended_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
