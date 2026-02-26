import express, { Router } from 'express';
import { SessionController } from '../controllers/SessionController.js';
import { authenticate } from '../middleware/auth.js';

const router: Router = Router();

router.post('/', SessionController.create);
router.get('/:idOrCode', SessionController.getOne);
router.get('/join/:joinCode', SessionController.join);
router.post('/:sessionId/duplicate', SessionController.duplicate);
router.get('/:sessionId/export', SessionController.exportResults);
router.post('/:sessionId/start', authenticate as any, SessionController.start);
router.post('/:sessionId/end', authenticate as any, SessionController.end);

export default router;
