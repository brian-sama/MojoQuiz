import express from 'express';
import { SessionController } from '../controllers/SessionController.js';

const router = express.Router();

router.post('/', SessionController.create);
router.get('/:idOrCode', SessionController.getOne);
router.get('/join/:joinCode', SessionController.join);
router.post('/:sessionId/duplicate', SessionController.duplicate);
router.get('/:sessionId/export', SessionController.exportResults);
router.post('/:sessionId/end', SessionController.end);

export default router;
