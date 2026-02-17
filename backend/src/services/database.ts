/**
 * Database Service
 * Handles all database operations using @neondatabase/serverless
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

import type {
  Session,
  Participant,
  Question,
  Response,
  WordSubmission,
  TextResponse,
  WordCloudWord,
  LeaderboardEntry,
} from '../types/index.js';

// Initialize PostgreSQL Pool
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Tag function to run queries with param substitution
 */
async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  const result = await pool.query(text, values);
  return result.rows;
}


// ============================================
// SESSION OPERATIONS
// ============================================

export async function createSession(
  joinCode: string,
  title: string,
  presenterId: string,
  mode: string = 'mixed',
  expiresAt: Date
): Promise<Session> {
  const result = await sql`
    INSERT INTO sessions (join_code, title, presenter_id, mode, expires_at)
    VALUES (${joinCode}, ${title}, ${presenterId}, ${mode}, ${expiresAt})
    RETURNING *
  `;
  return result[0] as Session;
}

export async function getSessionByCode(joinCode: string): Promise<Session | null> {
  const result = await sql`
    SELECT * FROM sessions 
    WHERE join_code = ${joinCode} AND status = 'active'
  `;
  return result[0] as Session || null;
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const result = await sql`
    SELECT * FROM sessions WHERE id = ${sessionId}
  `;
  return result[0] as Session || null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: string
): Promise<void> {
  if (status === 'ended') {
    await sql`
      UPDATE sessions 
      SET status = ${status}, ended_at = NOW() 
      WHERE id = ${sessionId}
    `;
  } else {
    await sql`
      UPDATE sessions SET status = ${status} WHERE id = ${sessionId}
    `;
  }
}

export async function setCurrentQuestion(
  sessionId: string,
  questionId: string | null
): Promise<void> {
  await sql`
    UPDATE sessions 
    SET current_question_id = ${questionId} 
    WHERE id = ${sessionId}
  `;
}

export async function expireOldSessions(): Promise<number> {
  const result = await sql`
    UPDATE sessions 
    SET status = 'ended', ended_at = NOW()
    WHERE status = 'active' AND expires_at < NOW()
    RETURNING id
  `;
  return result.length;
}

// ============================================
// PARTICIPANT OPERATIONS
// ============================================

export async function getOrCreateParticipant(
  sessionId: string,
  cookieId: string,
  socketId: string,
  nickname?: string
): Promise<Participant> {
  // Try to find existing participant
  const existing = await sql`
    SELECT * FROM participants 
    WHERE session_id = ${sessionId} AND cookie_id = ${cookieId}
  `;

  if (existing.length > 0) {
    // Update socket_id and connection status
    const updated = await sql`
      UPDATE participants 
      SET socket_id = ${socketId}, is_connected = true, last_seen_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING *
    `;
    return updated[0] as Participant;
  }

  // Create new participant
  const result = await sql`
    INSERT INTO participants (session_id, cookie_id, socket_id, nickname)
    VALUES (${sessionId}, ${cookieId}, ${socketId}, ${nickname})
    RETURNING *
  `;
  return result[0] as Participant;
}

export async function updateParticipantNickname(
  participantId: string,
  nickname: string
): Promise<void> {
  await sql`
    UPDATE participants SET nickname = ${nickname} WHERE id = ${participantId}
  `;
}

export async function disconnectParticipant(socketId: string): Promise<Participant | null> {
  const result = await sql`
    UPDATE participants 
    SET is_connected = false, socket_id = NULL, last_seen_at = NOW()
    WHERE socket_id = ${socketId}
    RETURNING *
  `;
  return result[0] as Participant || null;
}

export async function removeParticipant(participantId: string): Promise<void> {
  await sql`
    UPDATE participants SET is_removed = true, is_connected = false 
    WHERE id = ${participantId}
  `;
}

export async function getSessionParticipants(sessionId: string): Promise<Participant[]> {
  const result = await sql`
    SELECT * FROM participants 
    WHERE session_id = ${sessionId} AND is_removed = false
    ORDER BY joined_at
  `;
  return result as Participant[];
}

export async function getConnectedParticipantCount(sessionId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM participants 
    WHERE session_id = ${sessionId} AND is_connected = true AND is_removed = false
  `;
  return parseInt(result[0].count, 10);
}

export async function getParticipantBySocket(socketId: string): Promise<Participant | null> {
  const result = await sql`
    SELECT * FROM participants WHERE socket_id = ${socketId}
  `;
  return result[0] as Participant || null;
}

// ============================================
// QUESTION OPERATIONS
// ============================================

export async function createQuestion(question: Partial<Question>): Promise<Question> {
  const result = await sql`
    INSERT INTO questions (
      session_id, question_type, question_text, options, settings,
      correct_answer, time_limit, display_order
    )
    VALUES (
      ${question.session_id}, ${question.question_type}, ${question.question_text},
      ${JSON.stringify(question.options)}, ${JSON.stringify(question.settings || {})},
      ${JSON.stringify(question.correct_answer)}, ${question.time_limit},
      ${question.display_order}
    )
    RETURNING *
  `;
  return result[0] as Question;
}

export async function getQuestionsBySession(sessionId: string): Promise<Question[]> {
  const result = await sql`
    SELECT * FROM questions 
    WHERE session_id = ${sessionId}
    ORDER BY display_order
  `;
  return result as Question[];
}

export async function getQuestionById(questionId: string): Promise<Question | null> {
  const result = await sql`
    SELECT * FROM questions WHERE id = ${questionId}
  `;
  return result[0] as Question || null;
}

export async function activateQuestion(
  sessionId: string,
  questionId: string
): Promise<void> {
  // Deactivate all other questions
  await sql`
    UPDATE questions SET is_active = false WHERE session_id = ${sessionId}
  `;
  // Activate the specified question
  await sql`
    UPDATE questions 
    SET is_active = true, activated_at = NOW(), is_locked = false, is_results_visible = false
    WHERE id = ${questionId}
  `;
  // Update session's current question
  await setCurrentQuestion(sessionId, questionId);
}

export async function lockQuestion(questionId: string): Promise<void> {
  await sql`UPDATE questions SET is_locked = true WHERE id = ${questionId}`;
}

export async function unlockQuestion(questionId: string): Promise<void> {
  await sql`UPDATE questions SET is_locked = false WHERE id = ${questionId}`;
}

export async function showResults(questionId: string): Promise<void> {
  await sql`UPDATE questions SET is_results_visible = true WHERE id = ${questionId}`;
}

export async function getActiveQuestion(sessionId: string): Promise<Question | null> {
  const result = await sql`
    SELECT * FROM questions 
    WHERE session_id = ${sessionId} AND is_active = true
  `;
  return result[0] as Question || null;
}

// ============================================
// RESPONSE OPERATIONS
// ============================================

export async function submitResponse(
  questionId: string,
  participantId: string,
  sessionId: string,
  responseData: any,
  isCorrect?: boolean,
  score?: number,
  responseTimeMs?: number
): Promise<{ success: boolean; isDuplicate: boolean; response?: Response }> {
  try {
    const result = await sql`
      INSERT INTO responses (
        question_id, participant_id, session_id, response_data,
        is_correct, score, response_time_ms
      )
      VALUES (
        ${questionId}, ${participantId}, ${sessionId},
        ${JSON.stringify(responseData)},
        ${isCorrect ?? null}, ${score ?? 0}, ${responseTimeMs ?? null}
      )
      RETURNING *
    `;

    // Update participant score if quiz mode
    if (score && score > 0) {
      await sql`
        UPDATE participants 
        SET total_score = total_score + ${score}
        WHERE id = ${participantId}
      `;
    }

    return { success: true, isDuplicate: false, response: result[0] as Response };
  } catch (error: any) {
    // Check for unique constraint violation (duplicate vote)
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return { success: false, isDuplicate: true };
    }
    throw error;
  }
}

export async function getResponseCount(questionId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM responses WHERE question_id = ${questionId}
  `;
  return parseInt(result[0].count, 10);
}

export async function getPollResults(questionId: string): Promise<{ [key: string]: number }> {
  const result = await sql`
    SELECT response_data->>'option_index' as option_index, COUNT(*) as count
    FROM responses
    WHERE question_id = ${questionId}
    GROUP BY response_data->>'option_index'
  `;

  const results: { [key: string]: number } = {};
  result.forEach((row: any) => {
    results[row.option_index] = parseInt(row.count, 10);
  });
  return results;
}

export async function getScaleStatistics(questionId: string): Promise<{
  count: number;
  average: number;
  min: number;
  max: number;
}> {
  const result = await sql`
    SELECT 
      COUNT(*) as count,
      AVG((response_data->>'value')::numeric) as average,
      MIN((response_data->>'value')::numeric) as min,
      MAX((response_data->>'value')::numeric) as max
    FROM responses
    WHERE question_id = ${questionId}
  `;
  return {
    count: parseInt(result[0].count, 10),
    average: parseFloat(result[0].average) || 0,
    min: parseFloat(result[0].min) || 0,
    max: parseFloat(result[0].max) || 0,
  };
}

// ============================================
// WORD CLOUD OPERATIONS
// ============================================

export async function submitWords(
  questionId: string,
  participantId: string,
  words: { original: string; normalized: string; filtered: boolean }[]
): Promise<void> {
  for (const word of words) {
    await sql`
      INSERT INTO word_submissions (
        question_id, participant_id, original_word, normalized_word, is_filtered
      )
      VALUES (${questionId}, ${participantId}, ${word.original}, ${word.normalized}, ${word.filtered})
    `;
  }
}

export async function getWordCloudData(
  questionId: string,
  limit: number = 100
): Promise<WordCloudWord[]> {
  const result = await sql`
    SELECT normalized_word as word, COUNT(*) as weight
    FROM word_submissions
    WHERE question_id = ${questionId} AND is_filtered = false
    GROUP BY normalized_word
    ORDER BY weight DESC
    LIMIT ${limit}
  `;
  return result.map((row: any) => ({
    word: row.word,
    weight: parseInt(row.weight, 10),
  }));
}

// ============================================
// TEXT RESPONSE OPERATIONS
// ============================================

export async function submitTextResponse(
  questionId: string,
  participantId: string,
  content: string
): Promise<{ success: boolean; isDuplicate: boolean; response?: TextResponse }> {
  try {
    const result = await sql`
      INSERT INTO text_responses (question_id, participant_id, content)
      VALUES (${questionId}, ${participantId}, ${content})
      RETURNING *
    `;
    return { success: true, isDuplicate: false, response: result[0] as TextResponse };
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return { success: false, isDuplicate: true };
    }
    throw error;
  }
}

export async function getTextResponses(
  questionId: string,
  status?: string
): Promise<TextResponse[]> {
  if (status) {
    const result = await sql`
      SELECT * FROM text_responses 
      WHERE question_id = ${questionId} AND moderation_status = ${status}
      ORDER BY submitted_at
    `;
    return result as TextResponse[];
  }

  const result = await sql`
    SELECT * FROM text_responses 
    WHERE question_id = ${questionId}
    ORDER BY submitted_at
  `;
  return result as TextResponse[];
}

export async function moderateTextResponse(
  responseId: string,
  status: 'approved' | 'hidden' | 'highlighted'
): Promise<void> {
  await sql`
    UPDATE text_responses 
    SET moderation_status = ${status}, moderated_at = NOW()
    WHERE id = ${responseId}
  `;
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export async function getLeaderboard(
  sessionId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const result = await sql`
    SELECT id as participant_id, nickname, total_score,
           RANK() OVER (ORDER BY total_score DESC) as rank
    FROM participants
    WHERE session_id = ${sessionId} AND is_removed = false AND nickname IS NOT NULL
    ORDER BY total_score DESC
    LIMIT ${limit}
  `;
  return result.map((row: any) => ({
    participant_id: row.participant_id,
    nickname: row.nickname,
    total_score: row.total_score,
    rank: parseInt(row.rank, 10),
  }));
}

export default {
  // Session
  createSession,
  getSessionByCode,
  getSessionById,
  updateSessionStatus,
  setCurrentQuestion,
  expireOldSessions,

  // Participant
  getOrCreateParticipant,
  updateParticipantNickname,
  disconnectParticipant,
  removeParticipant,
  getSessionParticipants,
  getConnectedParticipantCount,
  getParticipantBySocket,

  // Question
  createQuestion,
  getQuestionsBySession,
  getQuestionById,
  activateQuestion,
  lockQuestion,
  unlockQuestion,
  showResults,
  getActiveQuestion,

  // Response
  submitResponse,
  getResponseCount,
  getPollResults,
  getScaleStatistics,

  // Word Cloud
  submitWords,
  getWordCloudData,

  // Text Response
  submitTextResponse,
  getTextResponses,
  moderateTextResponse,

  // Leaderboard
  getLeaderboard,
};
