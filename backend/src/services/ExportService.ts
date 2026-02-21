import { EngagementService } from './EngagementService.js';
import db from './database.js';
import logger from '../utils/logger.js';

export class ExportService {
    /**
     * Export session results to JSON
     */
    static async exportToJson(sessionId: string) {
        const analytics = await EngagementService.getSessionAnalytics(sessionId);
        const participants = await db.getSessionParticipants(sessionId);

        return {
            ...analytics,
            participants: participants.map(p => ({
                nickname: p.nickname,
                score: p.total_score,
                joinedAt: p.joined_at
            }))
        };
    }

    /**
     * Export session results to CSV string
     */
    static async exportToCsv(sessionId: string): Promise<string> {
        try {
            const participants = await db.getSessionParticipants(sessionId);

            const header = 'Nickname,Score,JoinedAt\n';
            const rows = participants.map(p =>
                `"${p.nickname || 'Anonymous'}","${p.total_score}","${new Date(p.joined_at).toISOString()}"`
            ).join('\n');

            return header + rows;
        } catch (error) {
            logger.error({ sessionId, error }, 'Failed to generate CSV export');
            throw error;
        }
    }
}
