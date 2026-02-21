import express, { Router } from 'express';
import { QuestionController } from '../controllers/QuestionController.js';

const router: Router = Router();

// Session-specific question routes
// These are currently mounted under /api/sessions in app.ts, 
// but we'll reflect that in the mounting logic.
router.post('/:sessionId/questions', QuestionController.create);
router.get('/:sessionId/questions', QuestionController.getBySession);
router.post('/:sessionId/extract-questions', QuestionController.extract);

// Common question results
router.get('/:questionId/results', QuestionController.getResults);
router.patch('/:questionId/status', QuestionController.updateStatus);

export default router;
