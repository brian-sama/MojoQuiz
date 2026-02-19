import express, { Router, Request, Response } from 'express';
import db from '../services/database.js';
import { authenticate } from '../middleware/auth.js';

const router: Router = express.Router();

/**
 * List saved sessions
 * GET /api/library
 */
router.get('/', authenticate, async (req: any, res: Response) => {
    try {
        const sessions = await db.getSessionsByUserId(req.user.userId);
        res.json(sessions);
    } catch (error) {
        console.error('List library error:', error);
        res.status(500).json({ error: 'Failed to fetch library' });
    }
});

/**
 * Duplicate a session
 * POST /api/library/:id/duplicate
 */
router.post('/:id/duplicate', authenticate, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        // Verify ownership (simplified for now, ideally duplicateSession would check this)
        const session = await db.getSessionById(id);
        if (!session || session.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized or session not found' });
        }

        const newSession = await db.duplicateSession(id, title);
        res.json(newSession);
    } catch (error) {
        console.error('Duplicate library error:', error);
        res.status(500).json({ error: 'Failed to duplicate session' });
    }
});

/**
 * Delete a session (soft delete)
 * DELETE /api/library/:id
 */
router.delete('/:id', authenticate, async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const session = await db.getSessionById(id);
        if (!session || session.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized or session not found' });
        }

        await db.deleteSession(id);
        res.json({ message: 'Session deleted' });
    } catch (error) {
        console.error('Delete library error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

/**
 * Get templates
 * GET /api/library/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
    try {
        // For now, return a fixed set of "recommended" or template sessions
        // In a real app, these would be sessions flagged as templates
        const sessions = await db.getSessionsByUserId('system-template-id');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

export default router;
