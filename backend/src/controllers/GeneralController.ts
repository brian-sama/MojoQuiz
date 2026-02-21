import { Request, Response } from 'express';
import { aiService } from '../services/aiService.js';

export class GeneralController {
    static health(_req: Request, res: Response) {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    static async getTrivia(_req: Request, res: Response) {
        try {
            const fact = await aiService.getTriviaFact();
            res.json({ text: fact });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch trivia' });
        }
    }
}
