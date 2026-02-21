import db from './database.js';
import logger from '../utils/logger.js';

export interface EngagementMetrics {
    totalScore: number;
    accuracyRate: number;
    averageResponseTimeMs: number;
    participationRate: number;
    completionRate: number;
}

/**
 * Engagement Score Engine
 *
 * Formula: E = 0.4A + 0.3T + 0.2P + 0.1C
 * A = Accuracy (0–1) — correct / total responses
 * T = Speed normalized (0–1) — response time vs time limit
 * P = Participation rate (0–1) — questions answered / total questions
 * C = Completion rate (0–1) — participants who answered all / total participants
 */
export class EngagementService {

    /**
     * Calculate the engagement score for a single response
     */
    static calculateResponseScore(isCorrect: boolean | null, responseTimeMs: number | null, timeLimitMs: number | null): number {
        let score = 0;

        // Accuracy component (max 40 points)
        const accuracy = isCorrect === true ? 1 : 0;
        score += accuracy * 40;

        // Speed component (max 30 points)
        if (responseTimeMs !== null && timeLimitMs !== null && timeLimitMs > 0) {
            // Normalize: 0 = used full time, 1 = instant
            const speedFactor = Math.max(0, Math.min(1, 1 - (responseTimeMs / timeLimitMs)));
            score += Math.round(speedFactor * 30);
        } else if (responseTimeMs !== null) {
            // Fallback: < 2s = max speed, > 10s = min speed
            const speedFactor = Math.max(0, Math.min(1, (10000 - responseTimeMs) / 8000));
            score += Math.round(speedFactor * 30);
        }

        return score;
    }

    /**
     * Compute the full engagement score for a session
     * E = 0.4A + 0.3T + 0.2P + 0.1C (all normalized 0–1, result 0–1)
     */
    static computeSessionEngagement(
        accuracy: number,    // 0–1
        speed: number,       // 0–1
        participation: number, // 0–1
        completion: number    // 0–1
    ): number {
        return (
            0.4 * Math.max(0, Math.min(1, accuracy)) +
            0.3 * Math.max(0, Math.min(1, speed)) +
            0.2 * Math.max(0, Math.min(1, participation)) +
            0.1 * Math.max(0, Math.min(1, completion))
        );
    }

    /**
     * Aggregate session analytics from real data
     */
    static async getSessionAnalytics(sessionId: string) {
        try {
            const stats = await db.getSessionStats(sessionId);
            const results = await db.getSessionVoteResults(sessionId);

            return {
                sessionId,
                totalParticipants: stats.participant_count,
                averageScore: stats.avg_score,
                totalResponses: stats.total_responses,
                questionStats: results,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`Error calculating session analytics for ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Creativity score for brainstorming
     * 5 points per vote received, capped at 30 points
     */
    static calculateCreativityScore(votesReceived: number): number {
        return Math.min(30, votesReceived * 5);
    }
}
