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
  User,
  AuthToken,
  RefreshToken
} from '../types/index.js';
export type QuestionType = 'poll' | 'quiz_mc' | 'scale' | 'nps' | 'brainstorm' | 'word_cloud';
import logger from '../utils/logger.js';

// Initialize PostgreSQL Pool
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is required');
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  const result = await pool.query(text, values);
  return result.rows;
}

/**
 * Map DB session to camelCase interface
 */
function mapSession(dbSession: any): any | null {
  if (!dbSession) return null;
  return {
    ...dbSession,
    joinCode: dbSession.join_code,
    presenterId: dbSession.presenter_id,
    userId: dbSession.user_id,
    expiresAt: dbSession.expires_at,
    currentQuestionId: dbSession.current_question_id,
  };
}

/**
 * Map DB user to camelCase interface
 */
function mapUser(dbUser: any): User | null {
  if (!dbUser) return null;
  return {
    ...dbUser,
    display_name: dbUser.display_name, // Keeping snake_case for now as interface has it
    avatar_url: dbUser.avatar_url,
    password_hash: dbUser.password_hash,
    auth_provider: dbUser.auth_provider,
    google_id: dbUser.google_id,
    linkedin_id: dbUser.linkedin_id,
    last_login_at: dbUser.last_login_at,
    organizationId: dbUser.organization_id || null, // Map to camelCase
  } as User;
}



// ============================================
// SESSION OPERATIONS
// ============================================

export async function createSession(
  joinCode: string,
  title: string,
  presenterId: string,
  mode: string = 'mixed',
  expiresAt: Date,
  user_id?: string
): Promise<Session> {
  const result = await sql`
    INSERT INTO sessions (join_code, title, presenter_id, mode, expires_at, user_id)
    VALUES (${joinCode}, ${title}, ${presenterId}, ${mode}, ${expiresAt}, ${user_id})
    RETURNING *
  `;
  return result[0] as Session;
}

export async function getSessionsByUserId(userId: string): Promise<Session[]> {
  const result = await sql`
    SELECT * FROM sessions 
    WHERE user_id = ${userId} AND is_deleted = false
    ORDER BY created_at DESC
  `;
  return result as Session[];
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`
    UPDATE sessions SET is_deleted = true WHERE id = ${sessionId}
  `;
}

export async function duplicateSession(sessionId: string, newTitle?: string): Promise<Session> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error('Session not found');

  const questions = await getQuestionsBySession(sessionId);

  // Create new session
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

  const newSession = await createSession(
    joinCode,
    newTitle || `${session.title} (Copy)`,
    session.presenter_id,
    session.mode,
    expiresAt,
    session.user_id || undefined
  );

  // Copy questions
  for (const q of questions) {
    await createQuestion({
      ...q,
      session_id: newSession.id,
      id: undefined, // Let DB generate new ID
      is_active: false
    });
  }

  return newSession;
}

export async function getSessionByCode(joinCode: string): Promise<Session | null> {
  const result = await sql`
    SELECT * FROM sessions 
    WHERE join_code = ${joinCode} AND status IN ('active', 'live')
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

export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<Session, 'status' | 'current_question_id' | 'title' | 'mode' | 'ended_at'>>
): Promise<Session> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push(`status = $${fields.length + 1}`);
    values.push(updates.status);
  }
  if (updates.current_question_id !== undefined) {
    fields.push(`current_question_id = $${fields.length + 1}`);
    values.push(updates.current_question_id);
  }
  if (updates.title !== undefined) {
    fields.push(`title = $${fields.length + 1}`);
    values.push(updates.title);
  }
  if (updates.mode !== undefined) {
    fields.push(`mode = $${fields.length + 1}`);
    values.push(updates.mode);
  }
  if (updates.ended_at !== undefined) {
    fields.push(`ended_at = $${fields.length + 1}`);
    values.push(updates.ended_at);
  }

  if (fields.length === 0) {
    const existing = await getSessionById(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }
    return existing;
  }

  const queryText = `
    UPDATE sessions
    SET ${fields.join(', ')}
    WHERE id = $${fields.length + 1}
    RETURNING *
  `;

  const result = await pool.query(queryText, [...values, sessionId]);
  if (result.rows.length === 0) {
    throw new Error('Session not found');
  }

  return result.rows[0] as Session;
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
    WHERE status IN ('active', 'live') AND expires_at < NOW()
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
  return {
    ...result[0],
    question_type: result[0].question_type as QuestionType
  } as Question;
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

export async function getRankingResults(questionId: string): Promise<{ [optionIndex: string]: number }> {
  // Calculates average rank for each option
  // Score = sum(rank) / count. Lower is better.
  const result = await sql`
    SELECT 
      jsonb_array_elements(response_data->'ranking')->>'index' as option_index,
      AVG((jsonb_array_elements(response_data->'ranking')->>'rank')::numeric) as average_rank
    FROM responses
    WHERE question_id = ${questionId}
    GROUP BY option_index
  `;

  const results: { [key: string]: number } = {};
  result.forEach((row: any) => {
    results[row.option_index] = parseFloat(row.average_rank);
  });
  return results;
}

export async function getPinImageResults(questionId: string): Promise<{ x: number, y: number }[]> {
  const result = await sql`
    SELECT response_data->>'x' as x, response_data->>'y' as y
    FROM responses
    WHERE question_id = ${questionId}
  `;

  return result.map((row: any) => ({
    x: parseFloat(row.x),
    y: parseFloat(row.y)
  }));
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
// USER & AUTH OPERATIONS
// ============================================

export async function createUser(userData: Partial<User>): Promise<User> {
  const result = await sql`
    INSERT INTO users (
      email, display_name, password_hash, auth_provider, google_id, linkedin_id, role, is_verified
    )
    VALUES (
      ${userData.email}, ${userData.display_name}, ${userData.password_hash}, 
      ${userData.auth_provider || 'email'}, ${userData.google_id}, 
      ${userData.linkedin_id}, ${userData.role || 'user'}, ${userData.is_verified || false}
    )
    RETURNING *
  `;
  return mapUser(result[0]) as User;
}

// User retrieval functions restored and cleaned up
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`SELECT * FROM public.users WHERE email = ${email.toLowerCase()}`;
  return mapUser(result[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`SELECT * FROM public.users WHERE id = ${id}`;
  return mapUser(result[0]);
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  return mapUser(result[0]);
}

export async function getUserByLinkedinId(linkedinId: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE linkedin_id = ${linkedinId}`;
  return mapUser(result[0]);
}

// Session operations moved to bottom implementation section

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.display_name !== undefined) {
    fields.push(`display_name = $${fields.length + 1}`);
    values.push(updates.display_name);
  }
  if (updates.password_hash !== undefined) {
    fields.push(`password_hash = $${fields.length + 1}`);
    values.push(updates.password_hash);
  }
  if (updates.is_verified !== undefined) {
    fields.push(`is_verified = $${fields.length + 1}`);
    values.push(updates.is_verified);
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${fields.length + 1}`);
    values.push(updates.avatar_url);
  }
  if (updates.last_login_at !== undefined) {
    fields.push(`last_login_at = $${fields.length + 1}`);
    values.push(updates.last_login_at);
  }
  if (updates.google_id !== undefined) {
    fields.push(`google_id = $${fields.length + 1}`);
    values.push(updates.google_id);
  }
  if (updates.linkedin_id !== undefined) {
    fields.push(`linkedin_id = $${fields.length + 1}`);
    values.push(updates.linkedin_id);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${fields.length + 1}`);
    values.push(updates.role);
  }

  if (fields.length === 0) return (await getUserById(id))!;

  if (fields.length === 0) return (await getUserById(id))!;

  const queryText = `UPDATE public.users SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`;

  // Custom call to pool.query but with our error helper logic
  try {
    const result = await pool.query(queryText, [...values, id]);
    return mapUser(result.rows[0]) as User;
  } catch (error) {
    const pathResult = await pool.query('SHOW search_path').catch(() => ({ rows: [{ search_path: 'unknown' }] }));
    logger.error({
      query: queryText,
      values: [...values, id],
      error,
      search_path: pathResult.rows[0].search_path
    }, '❌ updateUser Database Error');
    throw error;
  }
}

export async function createAuthToken(tokenData: Partial<AuthToken>): Promise<AuthToken> {
  const result = await sql`
    INSERT INTO auth_tokens (user_id, email, token_type, code, expires_at)
    VALUES (${tokenData.user_id}, ${tokenData.email}, ${tokenData.token_type}, ${tokenData.code}, ${tokenData.expires_at})
    RETURNING *
  `;
  return result[0] as AuthToken;
}

export async function getValidAuthToken(email: string, code: string, type: string): Promise<AuthToken | null> {
  const result = await sql`
    SELECT * FROM auth_tokens 
    WHERE (email = ${email} OR user_id IN (SELECT id FROM users WHERE email = ${email}))
    AND code = ${code} 
    AND token_type = ${type}
    AND expires_at > NOW()
    AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return (result[0] as AuthToken) || null;
}

export async function markAuthTokenUsed(tokenId: string): Promise<void> {
  await sql`UPDATE auth_tokens SET used_at = NOW() WHERE id = ${tokenId}`;
}

// ============================================
// BRAINSTORM OPERATIONS
// ============================================

async function submitIdea(
  questionId: string,
  participantId: string,
  content: string
): Promise<{ success: boolean; idea?: any }> {
  const existing = await sql`
    SELECT id FROM brainstorm_ideas
    WHERE question_id = ${questionId} AND participant_id = ${participantId}
  `;
  // Check max ideas per user (from question settings)
  const question = await getQuestionById(questionId);
  const maxIdeas = question?.settings?.max_ideas_per_user || 10;
  if (existing.length >= maxIdeas) {
    return { success: false };
  }
  const rows = await sql`
    INSERT INTO brainstorm_ideas (question_id, participant_id, content)
    VALUES (${questionId}, ${participantId}, ${content})
    RETURNING *
  `;
  return { success: true, idea: rows[0] };
}

async function getBrainstormIdeas(questionId: string): Promise<any[]> {
  const rows = await sql`
    SELECT bi.*, COALESCE(bv.vote_count, 0)::int AS vote_count
    FROM brainstorm_ideas bi
    LEFT JOIN (
      SELECT idea_id, COUNT(*) AS vote_count FROM brainstorm_votes GROUP BY idea_id
    ) bv ON bv.idea_id = bi.id
    WHERE bi.question_id = ${questionId} AND bi.status = 'active'
    ORDER BY vote_count DESC, bi.created_at ASC
  `;
  return rows;
}

async function voteIdea(
  ideaId: string,
  participantId: string
): Promise<{ success: boolean; action: 'voted' | 'unvoted' }> {
  // Toggle vote
  const existing = await sql`
    SELECT id FROM brainstorm_votes
    WHERE idea_id = ${ideaId} AND participant_id = ${participantId}
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM brainstorm_votes
      WHERE idea_id = ${ideaId} AND participant_id = ${participantId}
    `;
    return { success: true, action: 'unvoted' };
  } else {
    await sql`
      INSERT INTO brainstorm_votes (idea_id, participant_id)
      VALUES (${ideaId}, ${participantId})
    `;
    return { success: true, action: 'voted' };
  }
}

async function getIdeaVotesForParticipant(
  questionId: string,
  participantId: string
): Promise<string[]> {
  const rows = await sql`
    SELECT bv.idea_id FROM brainstorm_votes bv
    JOIN brainstorm_ideas bi ON bi.id = bv.idea_id
    WHERE bi.question_id = ${questionId} AND bv.participant_id = ${participantId}
  `;
  return rows.map((r: any) => r.idea_id);
}

// ============================================
// NPS OPERATIONS
// ============================================

async function getNpsResults(questionId: string): Promise<{
  count: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number;
  average: number;
}> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(AVG((response_data->>'value')::numeric), 0) AS average,
      COUNT(*) FILTER (WHERE (response_data->>'value')::int >= 9)::int AS promoters,
      COUNT(*) FILTER (WHERE (response_data->>'value')::int BETWEEN 7 AND 8)::int AS passives,
      COUNT(*) FILTER (WHERE (response_data->>'value')::int <= 6)::int AS detractors
    FROM responses
    WHERE question_id = ${questionId}
  `;
  const r = rows[0];
  const total = Number(r.count) || 1;
  const nps_score = Math.round(((Number(r.promoters) - Number(r.detractors)) / total) * 100);
  return {
    count: Number(r.count),
    promoters: Number(r.promoters),
    passives: Number(r.passives),
    detractors: Number(r.detractors),
    nps_score,
    average: Number(Number(r.average).toFixed(1)),
  };
}

// ============================================
// ANALYSIS & REPORTING
// ============================================

/**
 * Get a comprehensive report for a session
 */
async function getSessionReport(sessionId: string): Promise<any> {
  const session = await getSessionById(sessionId);
  if (!session) return null;

  const questions = await getQuestionsBySession(sessionId);
  const participants = await getSessionParticipants(sessionId);

  // Summary statistics
  const statsRows = await sql`
        SELECT 
            COUNT(DISTINCT participant_id)::int as total_participants,
            COUNT(*)::int as total_responses,
            COALESCE(AVG(response_time_ms), 0)::float as avg_response_time
        FROM responses
        WHERE session_id = ${sessionId}
    `;

  return {
    session,
    questions,
    participants,
    stats: statsRows[0]
  };
}

/**
 * Get leaderboard for a session based on scores
 */
async function getLeaderboard(sessionId: string, limit: number = 50): Promise<any[]> {
  const rows = await sql`
        SELECT 
            p.id,
            p.nickname,
            SUM(r.score)::int as total_score,
            COUNT(r.id) FILTER (WHERE r.is_correct = true)::int as correct_answers
        FROM participants p
        LEFT JOIN responses r ON p.id = r.participant_id
        WHERE p.session_id = ${sessionId}
        GROUP BY p.id, p.nickname
        ORDER BY total_score DESC
        LIMIT ${limit}
    `;
  return rows;
}

// ============================================
// FOLDER OPERATIONS
// ============================================

async function createFolder(userId: string, name: string, parentId?: string): Promise<any> {
  const rows = await sql`
    INSERT INTO folders (user_id, name, parent_id)
    VALUES (${userId}, ${name}, ${parentId || null})
    RETURNING *
  `;
  return rows[0];
}

async function getFoldersByUser(userId: string): Promise<any[]> {
  const rows = await sql`
    SELECT f.*, COALESCE(sc.count, 0)::int AS item_count
    FROM folders f
    LEFT JOIN (
      SELECT folder_id, COUNT(*) AS count FROM sessions WHERE folder_id IS NOT NULL GROUP BY folder_id
    ) sc ON sc.folder_id = f.id
    WHERE f.user_id = ${userId}
    ORDER BY f.name ASC
  `;
  return rows;
}

async function updateFolder(folderId: string, name: string): Promise<void> {
  await sql`UPDATE folders SET name = ${name}, updated_at = NOW() WHERE id = ${folderId}`;
}

async function deleteFolder(folderId: string): Promise<void> {
  // Unassign sessions first
  await sql`UPDATE sessions SET folder_id = NULL WHERE folder_id = ${folderId}`;
  await sql`DELETE FROM folders WHERE id = ${folderId}`;
}

async function moveSessionToFolder(sessionId: string, folderId: string | null): Promise<void> {
  await sql`UPDATE sessions SET folder_id = ${folderId} WHERE id = ${sessionId}`;
}

async function toggleFavorite(sessionId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE sessions SET is_favorite = NOT is_favorite WHERE id = ${sessionId} RETURNING is_favorite
  `;
  return rows[0]?.is_favorite ?? false;
}

async function updateSessionVisibility(sessionId: string, visibility: string): Promise<void> {
  await sql`UPDATE sessions SET visibility = ${visibility} WHERE id = ${sessionId}`;
}

export default {
  // Session
  createSession,
  getSessionByCode,
  getSessionById,
  updateSession,
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

  // Response & Result Utilities
  getResponseCount,
  getPollResults,
  getScaleStatistics,
  getRankingResults,
  getPinImageResults,
  getSessionReport,
  submitResponse,

  // Word Cloud
  submitWords,
  getWordCloudData,

  // Text Response
  submitTextResponse,
  getTextResponses,
  moderateTextResponse,

  // Brainstorm
  submitIdea,
  getBrainstormIdeas,
  voteIdea,
  getIdeaVotesForParticipant,

  // NPS
  getNpsResults,

  // Leaderboard
  getLeaderboard,

  // Library & Folders
  getSessionsByUserId,
  duplicateSession,
  deleteSession,
  createFolder,
  getFoldersByUser,
  updateFolder,
  deleteFolder,
  moveSessionToFolder,
  toggleFavorite,
  updateSessionVisibility,

  // User & Auth
  createUser,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  getUserByLinkedinId,
  updateUser,
  createAuthToken,
  getValidAuthToken,
  markAuthTokenUsed,

  // Refresh Token (hashed)
  createRefreshToken,
  getActiveRefreshTokens,
  revokeRefreshTokenById,
  revokeAllUserRefreshTokens,

  getDashboardStats,
  getSessionStats,

  // Admin
  getUsers,
  getAuditLogs,
  createAuditLog,
  getOrganizationById,
  getSessionVoteResults,
};

// ============================================
// REFRESH TOKEN OPERATIONS (Hashed)
// ============================================

export async function createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
  const result = await sql`
    INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
    RETURNING *
  `;
  return result[0];
}

/**
 * Get all active (non-revoked, non-expired) refresh tokens for bcrypt comparison.
 * Returns token_hash + user metadata for matching.
 */
export async function getActiveRefreshTokens() {
  const result = await sql`
    SELECT rt.id, rt.token_hash, rt.user_id, rt.expires_at, rt.is_revoked, u.role as user_role
    FROM public.refresh_tokens rt
    JOIN public.users u ON rt.user_id = u.id
    WHERE rt.is_revoked = false AND rt.expires_at > NOW()
    ORDER BY rt.created_at DESC
    LIMIT 500
  `;
  return result;
}

export async function revokeRefreshTokenById(tokenId: string) {
  await sql`UPDATE refresh_tokens SET is_revoked = true WHERE id = ${tokenId}`;
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await sql`UPDATE refresh_tokens SET is_revoked = true WHERE user_id = ${userId}`;
}

// ============================================
// AUDIT LOG OPERATIONS
// ============================================

export async function createAuditLog(actorId: string, action: string, metadata: Record<string, unknown> = {}) {
  const result = await sql`
    INSERT INTO audit_logs (actor_id, action, metadata)
    VALUES (${actorId}, ${action}, ${JSON.stringify(metadata)})
    RETURNING *
  `;
  return result[0];
}

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * Get aggregated stats for the dashboard hero cards
 */
export async function getDashboardStats(userId: string) {
  const stats = await sql`
    SELECT
      COUNT(DISTINCT s.id)::int AS total_sessions,
      COALESCE(SUM(CASE WHEN s.status IN ('active', 'live') THEN 1 ELSE 0 END), 0)::int AS active_drafts,
      COALESCE((
        SELECT COUNT(DISTINCT p.id)::int
        FROM participants p
        JOIN sessions s2 ON p.session_id = s2.id
        WHERE s2.user_id = ${userId} AND s2.is_deleted = false
      ), 0) AS total_participants,
      COALESCE((
        SELECT ROUND(AVG(p2.total_score)::numeric, 1)
        FROM participants p2
        JOIN sessions s3 ON p2.session_id = s3.id
        WHERE s3.user_id = ${userId} AND s3.is_deleted = false AND p2.total_score > 0
      ), 0) AS avg_engagement_score
    FROM sessions s
    WHERE s.user_id = ${userId} AND s.is_deleted = false
  `;
  return stats[0] || { total_sessions: 0, active_drafts: 0, total_participants: 0, avg_engagement_score: 0 };
}

/**
 * Get session-level stats for analytics
 */
export async function getSessionStats(sessionId: string) {
  const stats = await sql`
    SELECT
      COUNT(DISTINCT p.id)::int AS participant_count,
      COALESCE(AVG(p.total_score)::numeric, 0) AS avg_score,
      COUNT(DISTINCT r.id)::int AS total_responses
    FROM sessions s
    LEFT JOIN participants p ON p.session_id = s.id AND p.is_removed = false
    LEFT JOIN responses r ON r.session_id = s.id
    WHERE s.id = ${sessionId}
  `;
  return stats[0] || { participant_count: 0, avg_score: 0, total_responses: 0 };
}

/**
 * Get vote/response results per question for analytics
 */
export async function getSessionVoteResults(sessionId: string) {
  const rows = await sql`
    SELECT
      q.id,
      q.question_text,
      q.question_type,
      COUNT(r.id)::int AS response_count
    FROM questions q
    LEFT JOIN responses r ON r.question_id = q.id
    WHERE q.session_id = ${sessionId} AND q.is_deleted = false
    GROUP BY q.id, q.question_text, q.question_type
    ORDER BY q.display_order
  `;
  return rows;
}

/**
 * Get all users, optionally filtered by organization
 */
export async function getUsers(organizationId: string | null | undefined): Promise<User[]> {
  const orgId = organizationId ?? undefined;
  if (orgId) {
    const rows = await sql`
      SELECT * FROM users WHERE organization_id = ${organizationId} ORDER BY created_at DESC
    `;
    return rows as User[];
  }
  const rows = await sql`SELECT * FROM users ORDER BY created_at DESC`;
  return rows.map(mapUser).filter(Boolean) as User[];
}

/**
 * Get recent audit logs, optionally filtered by organization
 */
export async function getAuditLogs(organizationId: string | null | undefined, limit: number = 100): Promise<any[]> {
  const orgId = organizationId ?? undefined;
  if (orgId) {
    const rows = await sql`
      SELECT al.*, u.display_name as actor_name, u.email as actor_email
      FROM audit_logs al
      JOIN users u ON al.actor_id = u.id
      WHERE u.organization_id = ${organizationId}
      ORDER BY al.created_at DESC
      LIMIT ${limit}
    `;
    return rows;
  }
  const rows = await sql`
    SELECT al.*, u.display_name as actor_name, u.email as actor_email
    FROM audit_logs al
    JOIN users u ON al.actor_id = u.id
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Get organization details by ID
 */
export async function getOrganizationById(id: string): Promise<any | null> {
  const result = await sql`SELECT * FROM organizations WHERE id = ${id}`;
  return result[0] || null;
}

