import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

export const analyticsQueue = new Queue('analytics-queue', {
    connection: connection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export class QueueService {
    /**
     * Add a session report generation job to the queue
     */
    static async scheduleReportGeneration(sessionId: string) {
        try {
            await analyticsQueue.add('generate-report', { sessionId });
            logger.info({ sessionId }, 'Scheduled background report generation');
        } catch (error) {
            logger.error({ sessionId, error }, 'Failed to schedule report generation');
        }
    }
}
