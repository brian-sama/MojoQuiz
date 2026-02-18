/**
 * Express Application
 * REST API endpoints for the Engagement Platform
 */

import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Server as SocketServer } from 'socket.io'; // Adding this to help with inference if needed

import {
    generateJoinCode,
    getOrCreateParticipantCookie,
    PARTICIPANT_COOKIE_NAME,
    sanitizeInput,
    sanitizeNickname,
    getExpirationDate,
} from './utils/helpers.js';

import db from './services/database.js';

dotenv.config();

const app: Express = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// SESSION ENDPOINTS
// ============================================

/**
 * Create a new session (Presenter)
 * POST /api/sessions
 */
app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
        const { title, presenterId, mode = 'mixed' } = req.body;

        if (!title || !presenterId) {
            return res.status(400).json({ error: 'Title and presenterId are required' });
        }

        // Generate unique join code
        let joinCode: string;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            joinCode = generateJoinCode();
            const existing = await db.getSessionByCode(joinCode);
            if (!existing) break;
            attempts++;
        }

        if (attempts >= maxAttempts) {
            return res.status(500).json({ error: 'Failed to generate unique join code' });
        }

        // Create session with 24 hour expiration
        const expiresAt = getExpirationDate(
            parseInt(process.env.SESSION_EXPIRY_HOURS || '24')
        );

        const session = await db.createSession(
            joinCode!,
            sanitizeInput(title),
            sanitizeInput(presenterId, 100),
            mode,
            expiresAt
        );

        res.status(201).json({
            sessionId: session.id,
            joinCode: session.join_code,
            title: session.title,
            expiresAt: session.expires_at,
        });

    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * Get session info by join code
 * GET /api/sessions/:joinCode
 */
app.get('/api/sessions/:idOrCode', async (req: Request, res: Response) => {
    try {
        const { idOrCode } = req.params;
        let session;

        // UUIDs are 36 chars, join codes are 6 chars.
        if (idOrCode.length > 10) {
            session = await db.getSessionById(idOrCode);
        } else {
            session = await db.getSessionByCode(idOrCode.toUpperCase());
        }

        if (!session) {
            return res.status(404).json({ error: 'Session not found or ended' });
        }

        // Get participant count
        const participantCount = await db.getConnectedParticipantCount(session.id);

        // Get questions (for presenter)
        const questions = await db.getQuestionsBySession(session.id);

        res.json({
            session: {
                id: session.id,
                title: session.title,
                mode: session.mode,
                status: session.status,
                currentQuestionId: session.current_question_id,
                expiresAt: session.expires_at,
            },
            participantCount,
            questions,
        });

    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

/**
 * Join a session (Participant)
 * GET /api/join/:joinCode
 * Sets participant cookie and returns session info
 */
app.get('/api/join/:joinCode', async (req: Request, res: Response) => {
    try {
        const { joinCode } = req.params;

        const session = await db.getSessionByCode(joinCode.toUpperCase());

        if (!session) {
            return res.status(404).json({ error: 'Session not found or ended' });
        }

        if (session.status !== 'active') {
            return res.status(400).json({ error: 'Session is not active' });
        }

        // Get or create participant cookie
        const existingCookie = req.cookies[PARTICIPANT_COOKIE_NAME];
        const participantCookie = getOrCreateParticipantCookie(existingCookie);

        // Set cookie in response (30 days)
        res.cookie(PARTICIPANT_COOKIE_NAME, participantCookie, {
            httpOnly: false, // Frontend needs to read it
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.json({
            sessionId: session.id,
            sessionTitle: session.title,
            participantCookie,
        });

    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Failed to join session' });
    }
});

/**
 * End a session (Presenter)
 * POST /api/sessions/:sessionId/end
 */
app.post('/api/sessions/:sessionId/end', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        await db.updateSessionStatus(sessionId, 'ended');

        res.json({ success: true });

    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// ============================================
// QUESTION ENDPOINTS
// ============================================

/**
 * Create a question
 * POST /api/sessions/:sessionId/questions
 */
app.post('/api/sessions/:sessionId/questions', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { questionType, questionText, options, settings, correctAnswer, timeLimit, displayOrder } = req.body;

        if (!questionType || !questionText) {
            return res.status(400).json({ error: 'Question type and text are required' });
        }

        const question = await db.createQuestion({
            session_id: sessionId,
            question_type: questionType,
            question_text: sanitizeInput(questionText, 1000),
            options: options || null,
            settings: settings || {},
            correct_answer: correctAnswer || null,
            time_limit: timeLimit || null,
            display_order: displayOrder ?? 0,
        });

        res.status(201).json({ question });

    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: 'Failed to create question' });
    }
});

/**
 * Get all questions for a session
 * GET /api/sessions/:sessionId/questions
 */
app.get('/api/sessions/:sessionId/questions', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const questions = await db.getQuestionsBySession(sessionId);

        res.json({ questions });

    } catch (error) {
        console.error('Error getting questions:', error);
        res.status(500).json({ error: 'Failed to get questions' });
    }
});

// ============================================
// RESULTS ENDPOINTS
// ============================================

/**
 * Get poll results
 * GET /api/questions/:questionId/results
 */
app.get('/api/questions/:questionId/results', async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;

        const question = await db.getQuestionById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        let results: any;

        switch (question.question_type) {
            case 'poll':
            case 'quiz_mc':
            case 'quiz_tf':
                results = await db.getPollResults(questionId);
                break;
            case 'scale':
                results = await db.getScaleStatistics(questionId);
                break;
            case 'word_cloud':
                results = await db.getWordCloudData(questionId);
                break;
            case 'open_ended':
                results = await db.getTextResponses(questionId, 'approved');
                break;
            default:
                results = await db.getPollResults(questionId);
        }

        const responseCount = await db.getResponseCount(questionId);

        res.json({
            questionId,
            responseCount,
            results,
        });

    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ error: 'Failed to get results' });
    }
});

/**
 * Get leaderboard
 * GET /api/sessions/:sessionId/leaderboard
 */
app.get('/api/sessions/:sessionId/leaderboard', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        const leaderboard = await db.getLeaderboard(sessionId, limit);

        res.json({ leaderboard });

    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// ============================================
// MODERATION ENDPOINTS
// ============================================

/**
 * Moderate a text response
 * POST /api/responses/:responseId/moderate
 */
app.post('/api/responses/:responseId/moderate', async (req: Request, res: Response) => {
    try {
        const { responseId } = req.params;
        const { status } = req.body;

        if (!['approved', 'hidden', 'highlighted'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.moderateTextResponse(responseId, status);

        res.json({ success: true });

    } catch (error) {
        console.error('Error moderating response:', error);
        res.status(500).json({ error: 'Failed to moderate response' });
    }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;
