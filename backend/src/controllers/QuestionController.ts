import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../services/database.js';
import { aiService } from '../services/aiService.js';
import { sanitizeInput } from '../utils/helpers.js';

// Validation Schemas
const CreateQuestionSchema = z.object({
    questionType: z.string(),
    questionText: z.string().min(1).max(1000),
    options: z.any().nullable().optional(),
    settings: z.any().nullable().optional(),
    correctAnswer: z.any().nullable().optional(),
    timeLimit: z.number().nullable().optional(),
    displayOrder: z.number().optional().default(0),
});

const ExtractQuestionsSchema = z.object({
    sourceText: z.string().min(50, "Source text must be at least 50 characters"),
});

export class QuestionController {
    /**
     * Create a new question
     */
    static async create(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const validation = CreateQuestionSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({ error: validation.error.format() });
            }

            const {
                questionType,
                questionText,
                options,
                settings,
                correctAnswer,
                timeLimit,
                displayOrder
            } = validation.data;

            const question = await db.createQuestion({
                session_id: sessionId,
                question_type: questionType,
                question_text: sanitizeInput(questionText, 1000),
                options: options || null,
                settings: settings || {},
                correct_answer: correctAnswer || null,
                time_limit: timeLimit || null,
                display_order: displayOrder,
            });

            res.status(201).json({ question });
        } catch (error) {
            console.error('Error creating question:', error);
            res.status(500).json({ error: 'Failed to create question' });
        }
    }

    /**
     * Get all questions for a session
     */
    static async getBySession(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const questions = await db.getQuestionsBySession(sessionId);
            res.json({ questions });
        } catch (error) {
            console.error('Error getting questions:', error);
            res.status(500).json({ error: 'Failed to get questions' });
        }
    }

    /**
     * AI Question Extractor
     */
    static async extract(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const validation = ExtractQuestionsSchema.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({ error: validation.error.format() });
            }

            const { sourceText } = validation.data;

            const session = await db.getSessionById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            const questions = await aiService.generateQuestions(sourceText, session.mode);
            res.json({ questions });
        } catch (error: any) {
            console.error('Error in AI extraction:', error);
            res.status(500).json({ error: error.message || 'Failed to extract questions' });
        }
    }

    /**
     * Get poll/quiz results for a question
     */
    static async getResults(req: Request, res: Response) {
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
    }

    /**
     * Update question status (Point 14.3: Live poll interrupts)
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const { questionId } = req.params;
            const { isLocked } = req.body;

            const question = await db.getQuestionById(questionId);
            if (!question) return res.status(404).json({ error: 'Question not found' });

            if (isLocked) {
                await db.lockQuestion(questionId);
            } else {
                await db.unlockQuestion(questionId);
            }

            res.json({ success: true, isLocked });
        } catch (error) {
            console.error('Error updating question status:', error);
            res.status(500).json({ error: 'Failed to update question status' });
        }
    }
}
