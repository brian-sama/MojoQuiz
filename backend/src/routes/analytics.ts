import express, { Router, Response } from 'express';
import db from '../services/database.js';
import { authenticate } from '../middleware/auth.js';

const router: Router = express.Router();

/**
 * Get full session report
 * GET /api/analytics/:sessionId
 */
router.get('/:sessionId', authenticate, async (req: any, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Verify ownership
        const session = await db.getSessionById(sessionId);
        if (!session || session.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized or session not found' });
        }

        const report = await db.getSessionReport(sessionId);
        res.json(report);
    } catch (error) {
        console.error('Analytics report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

export default router;
