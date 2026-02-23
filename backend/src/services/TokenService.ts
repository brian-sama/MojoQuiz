import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from './database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_ACCESS_SECRET = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET) as string;
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || JWT_ACCESS_SECRET) as string;
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

if (!JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET environment variable is required');
}

export class TokenService {
    /**
     * Generate a signed access token
     */
    static generateAccessToken(userId: string, role: string): string {
        return jwt.sign({ userId, role }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    }

    /**
     * Verify an access token and return the decoded payload
     */
    static verifyAccessToken(token: string): { userId: string; role: string } {
        return jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string; role: string };
    }

    /**
     * Generate a cryptographically random refresh token, hash it, store in DB
     * Returns the raw (unhashed) token to send to the client
     */
    static async generateRefreshToken(userId: string): Promise<string> {
        const rawToken = crypto.randomBytes(64).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        await db.createRefreshToken(userId, tokenHash, expiresAt);

        return rawToken;
    }

    /**
     * Rotate tokens: verify refresh token, revoke old, issue new pair
     * Implements refresh token rotation with replay detection
     */
    static async rotateTokens(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        // Find all non-revoked tokens for comparison
        const candidates = await db.getActiveRefreshTokens();

        let matchedToken: {
            id: string;
            token_hash: string;
            user_id: string;
            expires_at: Date;
            is_revoked: boolean;
            user_role: string;
        } | null = null;

        for (const candidate of candidates) {
            const isMatch = await bcrypt.compare(rawRefreshToken, candidate.token_hash);
            if (isMatch) {
                matchedToken = candidate;
                break;
            }
        }

        if (!matchedToken) {
            logger.warn('Refresh token not found — possible replay attack');
            throw new Error('Invalid refresh token');
        }

        if (matchedToken.is_revoked) {
            // Replay detection: if a revoked token is reused, revoke ALL tokens for this user
            logger.warn({ userId: matchedToken.user_id }, 'Revoked refresh token reused — revoking all tokens for user');
            await db.revokeAllUserRefreshTokens(matchedToken.user_id);
            throw new Error('Token reuse detected');
        }

        if (new Date(matchedToken.expires_at) < new Date()) {
            await db.revokeRefreshTokenById(matchedToken.id);
            throw new Error('Refresh token expired');
        }

        // Revoke the old token (one-time use)
        await db.revokeRefreshTokenById(matchedToken.id);

        // Issue new pair
        const accessToken = this.generateAccessToken(matchedToken.user_id, matchedToken.user_role);
        const newRefreshToken = await this.generateRefreshToken(matchedToken.user_id);

        return { accessToken, refreshToken: newRefreshToken };
    }

    /**
     * Revoke a specific refresh token (for logout)
     */
    static async revokeToken(rawRefreshToken: string): Promise<void> {
        const candidates = await db.getActiveRefreshTokens();

        for (const candidate of candidates) {
            const isMatch = await bcrypt.compare(rawRefreshToken, candidate.token_hash);
            if (isMatch) {
                await db.revokeRefreshTokenById(candidate.id);
                return;
            }
        }
    }

    /**
     * Revoke all refresh tokens for a user (e.g., password change)
     */
    static async revokeAllUserTokens(userId: string): Promise<void> {
        await db.revokeAllUserRefreshTokens(userId);
    }
}
