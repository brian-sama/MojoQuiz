import express, { Router } from 'express';
import { QuestionController } from '../controllers/QuestionController.js';

const router: Router = Router();

// Session-specific question routes (mounted under /api/sessions)
router.post('/:sessionId/questions', QuestionController.create);
router.get('/:sessionId/questions', QuestionController.getBySession);
router.post('/:sessionId/extract-questions', QuestionController.extract);

export default router;
