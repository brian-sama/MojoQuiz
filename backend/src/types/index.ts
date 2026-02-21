/**
 * Type definitions for the Engagement Platform
 */

// Session types
export interface Session {
    id: string;
    join_code: string;
    title: string;
    presenter_id: string;
    mode: 'engagement' | 'quiz' | 'mixed';
    status: 'active' | 'paused' | 'ended';
    settings: SessionSettings;
    current_question_id: string | null;
    created_at: Date;
    expires_at: Date;
    ended_at: Date | null;
    // Library management
    user_id?: string | null;
    folder_id?: string | null;
    is_favorite?: boolean;
    is_deleted?: boolean;
    visibility?: 'private' | 'public' | 'workspace';
    description?: string;
    thumbnail_url?: string | null;
    play_count?: number;
}

export interface SessionSettings {
    allow_late_join?: boolean;
    show_participant_count?: boolean;
    anonymous_responses?: boolean;
}

// Participant types
export interface Participant {
    id: string;
    session_id: string;
    cookie_id: string;
    socket_id: string | null;
    nickname: string | null;
    avatar_color: string;
    total_score: number;
    is_connected: boolean;
    is_removed: boolean;
    joined_at: Date;
    last_seen_at: Date;
}

// Question types
export type QuestionType =
    | 'poll'           // Multiple choice poll
    | 'word_cloud'     // Word cloud
    | 'open_ended'     // Text response
    | 'scale'          // Slider/rating
    | 'ranking'        // Reordering items
    | 'pin_image'      // Drop pin on image
    | 'brainstorm'     // Idea submission + upvoting
    | 'nps'            // Net Promoter Score (0-10)
    | 'quiz_mc'        // Quiz multiple choice
    | 'quiz_tf'        // True/False
    | 'quiz_order'     // Ordering
    | 'quiz_slider'    // Estimation slider
    | 'quiz_typed'     // Typed answer
    | 'quiz_audio';    // Quiz with audio clip

export interface Question {
    id: string;
    session_id: string;
    question_type: QuestionType;
    question_text: string;
    options: QuestionOption[] | null;
    settings: QuestionSettings;
    correct_answer: any | null;
    time_limit: number | null;
    display_order: number;
    is_active: boolean;
    is_locked: boolean;
    is_results_visible: boolean;
    activated_at: Date | null;
    created_at: Date;
    // Media
    audio_url?: string | null;
    media_url?: string | null;
}

export interface QuestionOption {
    id: string;
    text: string;
    color?: string;
    imageUrl?: string;
}

export interface QuestionSettings {
    // Poll settings
    allow_multiple?: boolean;

    // Scale settings
    min_value?: number;
    max_value?: number;
    min_label?: string;
    max_label?: string;

    // Word cloud settings
    max_words?: number;

    // Ranking settings
    max_ranking_items?: number;

    // Pin on Image settings
    background_image_url?: string;

    // Quiz settings
    points?: number;
    tolerance?: number; // For slider estimation

    // NPS settings
    nps_question?: string; // Custom NPS prompt

    // Brainstorm settings
    max_ideas_per_user?: number;
    allow_voting?: boolean;

    // Audio settings
    audio_autoplay?: boolean;
    audio_loop?: boolean;
}

// Response types
export interface Response {
    id: string;
    question_id: string;
    participant_id: string;
    session_id: string;
    response_data: ResponseData;
    is_correct: boolean | null;
    score: number;
    response_time_ms: number | null;
    submitted_at: Date;
}

export type ResponseData =
    | { type: 'poll'; option_index: number | number[] }
    | { type: 'scale'; value: number }
    | { type: 'ranking'; ranking: { index: string; rank: number }[] }
    | { type: 'pin_image'; x: number; y: number }
    | { type: 'quiz_mc'; option_index: number }
    | { type: 'quiz_tf'; answer: boolean }
    | { type: 'quiz_order'; order: number[] }
    | { type: 'quiz_slider'; value: number }
    | { type: 'quiz_typed'; answer: string }
    | { type: 'quiz_audio'; option_index: number }
    | { type: 'nps'; value: number }
    | { type: 'brainstorm'; idea: string };

// Word submission
export interface WordSubmission {
    id: string;
    question_id: string;
    participant_id: string;
    original_word: string;
    normalized_word: string;
    is_filtered: boolean;
    submitted_at: Date;
}

// Text response with moderation
export interface TextResponse {
    id: string;
    question_id: string;
    participant_id: string;
    content: string;
    moderation_status: 'pending' | 'approved' | 'hidden' | 'highlighted';
    moderated_at: Date | null;
    submitted_at: Date;
}

// Aggregated results
export interface WordCloudWord {
    word: string;
    weight: number;
}

export interface PollResults {
    question_id: string;
    total_votes: number;
    options: { [index: string]: number };
}

export interface ScaleStatistics {
    question_id: string;
    total_responses: number;
    average: number;
    min: number;
    max: number;
    median: number;
}

export interface LeaderboardEntry {
    participant_id: string;
    nickname: string;
    total_score: number;
    rank: number;
}

// Socket event payloads
export interface JoinSessionPayload {
    join_code: string;
    cookie_id: string;
    nickname?: string;
}

export interface SubmitResponsePayload {
    question_id: string;
    response_data: ResponseData;
}

export interface SubmitWordsPayload {
    question_id: string;
    words: string[];
}

export interface SubmitTextPayload {
    question_id: string;
    content: string;
}

// Socket events from server
export interface SessionJoinedEvent {
    session_id: string;
    session_title: string;
    participant_id: string;
    active_question: Question | null;
    participant_count: number;
}

export interface QuestionActivatedEvent {
    question: Question;
    response_count: number;
    server_time: Date;
}

export interface VoteCountUpdatedEvent {
    question_id: string;
    response_count: number;
    results?: PollResults;
}

export interface ResultsRevealedEvent {
    question_id: string;
    results: PollResults | WordCloudWord[] | ScaleStatistics;
    correct_answer?: any;
}

export interface LeaderboardUpdatedEvent {
    leaderboard: LeaderboardEntry[];
}

export interface ErrorEvent {
    code: string;
    message: string;
    details?: any;
}

// Error codes
export const ErrorCodes = {
    INVALID_SESSION: 'INVALID_SESSION',
    SESSION_ENDED: 'SESSION_ENDED',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    DUPLICATE_RESPONSE: 'DUPLICATE_RESPONSE',
    QUESTION_LOCKED: 'QUESTION_LOCKED',
    PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED',
    RATE_LIMITED: 'RATE_LIMITED',
    INVALID_INPUT: 'INVALID_INPUT',
    PROFANITY_DETECTED: 'PROFANITY_DETECTED',
} as const;

// Brainstorm types
export interface BrainstormIdea {
    id: string;
    question_id: string;
    participant_id: string;
    content: string;
    group_label: string | null;
    status: 'active' | 'grouped' | 'hidden';
    created_at: Date;
    vote_count?: number;
    has_voted?: boolean; // For current participant context
}

export interface BrainstormVote {
    id: string;
    idea_id: string;
    participant_id: string;
    created_at: Date;
}

// Folder type
export interface Folder {
    id: string;
    user_id: string;
    name: string;
    parent_id: string | null;
    created_at: Date;
    updated_at: Date;
    item_count?: number;
}

// Brainstorm socket events
export interface SubmitIdeaPayload {
    question_id: string;
    content: string;
}

export interface VoteIdeaPayload {
    idea_id: string;
}

// User & Auth types
export interface User {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    password_hash: string | null;
    auth_provider: 'email' | 'google' | 'linkedin';
    google_id: string | null;
    linkedin_id: string | null;
    role: 'owner' | 'admin' | 'presenter' | 'analyst' | 'user';
    organizationId: string | null;
    is_verified: boolean;
    created_at: Date;
    last_login_at: Date | null;
}

export interface AuthToken {
    id: string;
    user_id: string | null;
    email: string | null;
    token_type: 'verify_email' | 'password_reset';
    code: string;
    expires_at: Date;
    used_at: Date | null;
    created_at: Date;
}

export interface RefreshToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
    revoked_at: Date | null;
}
