import { Router } from 'express';
import { QuestionController } from '../controllers/QuestionController.js';

const router: Router = Router();

router.get('/:questionId/results', QuestionController.getResults);
router.patch('/:questionId/status', QuestionController.updateStatus);

export default router;
