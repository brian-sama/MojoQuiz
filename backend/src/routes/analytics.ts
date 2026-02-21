import express, { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../services/database.js';
import { EngagementService } from '../services/EngagementService.js';
import { ExportService } from '../services/ExportService.js';
import logger from '../utils/logger.js';

const router: Router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Dashboard summary stats for the logged-in user
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
    try {
        const stats = await db.getDashboardStats(req.user!.id);
        res.json(stats);
    } catch (error) {
        logger.error({ error }, 'Error fetching dashboard stats');
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

/**
 * GET /api/analytics/:sessionId
 * Full analytics report for a session
 */
router.get('/:sessionId', authenticate, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Verify session belongs to user
        const session = await db.getSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (session.user_id && session.user_id !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const participants = await db.getSessionParticipants(sessionId);
        const questions = await db.getQuestionsBySession(sessionId);
        const analytics = await EngagementService.getSessionAnalytics(sessionId);

        // Build per-question response data
        const questionDetails = [];
        for (const q of questions) {
            const responseCount = await db.getResponseCount(q.id);
            let extraData = null;

            if (q.question_type === 'poll' || q.question_type === 'quiz_mc') {
                extraData = await db.getPollResults(q.id);
            } else if (q.question_type === 'scale') {
                extraData = await db.getScaleStatistics(q.id);
            } else if (q.question_type === 'nps') {
                extraData = await db.getNpsResults(q.id);
            }

            questionDetails.push({
                ...q,
                responseCount,
                extraData,
            });
        }

        res.json({
            session,
            participants,
            questions: questionDetails,
            responses: analytics,
            stats: {
                totalParticipants: analytics.totalParticipants,
                totalResponses: analytics.totalResponses,
                averageScore: analytics.averageScore,
            }
        });
    } catch (error) {
        logger.error({ error }, 'Error fetching session analytics');
        res.status(500).json({ error: 'Failed to load report' });
    }
});

/**
 * GET /api/analytics/:sessionId/export?format=csv|json
 * Export session data
 */
router.get('/:sessionId/export', authenticate, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { format = 'json' } = req.query;

        // Verify session belongs to user
        const session = await db.getSessionById(sessionId);
        if (!session || (session.user_id && session.user_id !== req.user!.id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (format === 'csv') {
            const csv = await ExportService.exportToCsv(sessionId);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=session_${sessionId}.csv`);
            return res.send(csv);
        }

        const data = await ExportService.exportToJson(sessionId);
        res.json(data);
    } catch (error) {
        logger.error({ error }, 'Export error');
        res.status(500).json({ error: 'Failed to export' });
    }
});

export default router;
