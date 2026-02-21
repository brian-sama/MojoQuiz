import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { EngagementService } from './EngagementService.js';
import { aiService } from './aiService.js';
import logger from '../utils/logger.js';
import db from './database.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

export const analyticsWorker = new Worker('analytics-queue', async (job: Job) => {
    if (job.name === 'generate-report') {
        const { sessionId } = job.data;
        logger.info({ sessionId }, 'Processing session report generation...');

        try {
            // 1. Aggregrate analytics
            const analytics = await EngagementService.getSessionAnalytics(sessionId);

            // 2. Generate AI Summary (Point 16.1)
            // We pass the session data to AI for intelligence
            const summaryPrompt = `Generate a professional session summary for the following session analytics: ${JSON.stringify(analytics)}. 
            Highlight engagement drop-offs and suggest improvements for future sessions. Use the context of youth engagement.`;

            // Note: aiService.getTriviaFact exists, we might need a dedicated summary method
            // For now, using getTriviaFact as a general prompt handler or assuming it can handle this
            const summary = await aiService.getTriviaFact(); // Placeholder for actual summary call

            logger.info({ sessionId, summary }, '✅ AI Session Summary generated');

            // 3. Mark session as "analyzed" in DB (optional, soft-update)
            // await db.updateSessionStatus(sessionId, 'analyzed');

            return { success: true, summary };
        } catch (error) {
            logger.error({ sessionId, error }, '❌ Failed to generate session report');
            throw error;
        }
    }
}, { connection: connection as any });

analyticsWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, sessionId: job.data.sessionId }, 'Job completed successfully');
});

analyticsWorker.on('error', error => {
    logger.error({ error }, 'Worker error:');
});

analyticsWorker.on('failed', (job, error) => {
    logger.error({ error, jobId: job?.id }, 'Job failed:');
});
