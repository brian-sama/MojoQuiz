import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../services/database.js';
import { ExportService } from '../services/ExportService.js';
import {
    generateJoinCode,
    getOrCreateParticipantCookie,
    PARTICIPANT_COOKIE_NAME,
    sanitizeInput,
    getExpirationDate,
} from '../utils/helpers.js';

// Validation Schemas
const CreateSessionSchema = z.object({
    title: z.string().min(3).max(100),
    presenterId: z.string().optional(),
    user_id: z.string().optional(),
    mode: z.enum(['mixed', 'quiz', 'poll']).default('mixed'),
}).refine(data => data.presenterId || data.user_id, {
    message: "Either presenterId or user_id must be provided",
    path: ["presenterId"]
});

export class SessionController {
    /**
     * Create a new session
     */
    static async create(req: Request, res: Response) {
        try {
            const validation = CreateSessionSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({ error: validation.error.format() });
            }

            const { title, presenterId, mode, user_id } = validation.data;

            // Generate unique join code
            let joinCode: string = '';
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

            // Expiration (24h default)
            const expiresAt = getExpirationDate(
                parseInt(process.env.SESSION_EXPIRY_HOURS || '24')
            );

            const session = await db.createSession(
                joinCode,
                sanitizeInput(title),
                user_id || sanitizeInput(presenterId!, 100),
                mode,
                expiresAt,
                user_id
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
    }

    /**
     * Duplicate an existing session (Point 14.3)
     */
    static async duplicate(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const originalSession = await db.getSessionById(sessionId);
            if (!originalSession) return res.status(404).json({ error: 'Session not found' });

            let joinCode = '';
            let attempts = 0;
            while (attempts < 10) {
                joinCode = generateJoinCode();
                if (!(await db.getSessionByCode(joinCode))) break;
                attempts++;
            }

            const expiresAt = getExpirationDate(parseInt(process.env.SESSION_EXPIRY_HOURS || '24'));

            const newSession = await db.createSession(
                joinCode,
                `Copy of ${originalSession.title}`,
                originalSession.presenter_id,
                originalSession.mode,
                expiresAt,
                originalSession.user_id
            );

            // Duplicate questions
            const questions = await db.getQuestionsBySession(sessionId);
            for (const q of questions) {
                await db.createQuestion(
                    newSession.id,
                    q.question_text,
                    q.question_type,
                    q.options,
                    q.correct_answer,
                    q.time_limit
                );
            }

            res.status(201).json({
                sessionId: newSession.id,
                joinCode: newSession.join_code,
                title: newSession.title
            });
        } catch (error) {
            console.error('Error duplicating session:', error);
            res.status(500).json({ error: 'Failed to duplicate session' });
        }
    }

    /**
     * Get session info by join code or ID
     */
    static async getOne(req: Request, res: Response) {
        try {
            const { idOrCode } = req.params;
            let session;

            if (idOrCode.length > 10) {
                session = await db.getSessionById(idOrCode);
            } else {
                session = await db.getSessionByCode(idOrCode.toUpperCase());
            }

            if (!session) {
                return res.status(404).json({ error: 'Session not found or ended' });
            }

            const participantCount = await db.getConnectedParticipantCount(session.id);
            const questions = await db.getQuestionsBySession(session.id);

            res.json({
                session: {
                    id: session.id,
                    join_code: session.join_code,
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
    }

    /**
     * Join a session
     */
    static async join(req: Request, res: Response) {
        try {
            const { joinCode } = req.params;
            const session = await db.getSessionByCode(joinCode.toUpperCase());

            if (!session) {
                return res.status(404).json({ error: 'Session not found or ended' });
            }

            if (session.status !== 'active') {
                return res.status(400).json({ error: 'Session is not active' });
            }

            const existingCookie = req.cookies[PARTICIPANT_COOKIE_NAME];
            const participantCookie = getOrCreateParticipantCookie(existingCookie);

            res.cookie(PARTICIPANT_COOKIE_NAME, participantCookie, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
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
    }

    /**
     * End a session
     */
    static async end(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            await db.updateSessionStatus(sessionId, 'ended');
            res.json({ success: true });
        } catch (error) {
            console.error('Error ending session:', error);
            res.status(500).json({ error: 'Failed to end session' });
        }
    }

    /**
     * Export session results (Point 5.1)
     */
    static async exportResults(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const { format = 'json' } = req.query;

            if (format === 'csv') {
                const csv = await ExportService.exportToCsv(sessionId);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=session_${sessionId}.csv`);
                return res.send(csv);
            }

            const data = await ExportService.exportToJson(sessionId);
            res.json(data);
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).json({ error: 'Failed to export results' });
        }
    }
}
