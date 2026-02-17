-- Engagement Platform Database Schema
-- For MySQL / MariaDB on cPanel
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    status ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
    mode ENUM('mentimeter', 'kahoot') DEFAULT 'mentimeter',
    current_question_index INT DEFAULT 0,
    participant_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);
-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    participant_token VARCHAR(64) UNIQUE NOT NULL,
    status ENUM('active', 'removed', 'disconnected') DEFAULT 'active',
    total_score INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    total_answers INT DEFAULT 0,
    streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    avatar_color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_token (participant_token)
);
-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    type ENUM(
        'poll',
        'word_cloud',
        'scale',
        'quiz_mc',
        'quiz_tf',
        'open_ended'
    ) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    options JSON,
    settings JSON,
    status ENUM(
        'pending',
        'active',
        'locked',
        'revealed',
        'completed'
    ) DEFAULT 'pending',
    order_index INT DEFAULT 0,
    started_at TIMESTAMP NULL,
    response_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
);
-- Responses table
CREATE TABLE IF NOT EXISTS responses (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    participant_id VARCHAR(36) NOT NULL,
    participant_nickname VARCHAR(50),
    answer_type ENUM('choice', 'text', 'word_cloud', 'scale') NOT NULL,
    selected_options JSON,
    text_response TEXT,
    word_responses JSON,
    scale_value INT,
    is_correct BOOLEAN,
    points_earned INT DEFAULT 0,
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response (question_id, participant_id),
    INDEX idx_session (session_id),
    INDEX idx_question (question_id)
);
-- Word submissions for word cloud aggregation
CREATE TABLE IF NOT EXISTS word_submissions (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    word VARCHAR(100) NOT NULL,
    count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_word (question_id, word),
    INDEX idx_question (question_id)
);