/**
 * Shared Types for Frontend
 */

// Session types
export interface Session {
    id: string;
    join_code: string;
    title: string;
    mode: 'engagement' | 'quiz' | 'mixed';
    status: 'active' | 'paused' | 'ended';
    currentQuestionId: string | null;
    expiresAt: string;
}

// Participant types
export interface Participant {
    id: string;
    nickname: string | null;
    avatar_color: string;
    total_score: number;
    is_connected: boolean;
}

// Question types
export type QuestionType =
    | 'poll'
    | 'word_cloud'
    | 'open_ended'
    | 'scale'
    | 'quiz_mc'
    | 'quiz_tf'
    | 'quiz_order'
    | 'quiz_slider'
    | 'quiz_typed';

export interface QuestionOption {
    id: string;
    text: string;
    color?: string;
}

export interface Question {
    id: string;
    session_id: string;
    question_type: QuestionType;
    question_text: string;
    description?: string;
    options: QuestionOption[] | null;
    settings: QuestionSettings;
    correct_answer?: any;
    time_limit: number | null;
    display_order: number;
    order_index?: number;
    response_count?: number;
    is_active: boolean;
    is_locked: boolean;
    is_results_visible: boolean;
    started_at?: string;
}

export interface QuestionSettings {
    allow_multiple?: boolean;
    min_value?: number;
    max_value?: number;
    min_label?: string;
    max_label?: string;
    max_words?: number;
    points?: number;
    tolerance?: number;
}

// Results types
export interface PollResults {
    [optionIndex: string]: number;
}

export interface WordCloudWord {
    word: string;
    weight: number;
}

export interface ScaleStatistics {
    count: number;
    average: number;
    min: number;
    max: number;
}

export interface LeaderboardEntry {
    participant_id: string;
    nickname: string;
    total_score: number;
    rank: number;
}

// Socket event payloads
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
    server_time: string;
}

export interface ResponseSubmittedEvent {
    success: boolean;
    question_id: string;
    participant_id?: string;
    is_correct?: boolean;
    score?: number;
    points_earned?: number;
    total_score?: number;
    correct_answer_ids?: string[];
}
