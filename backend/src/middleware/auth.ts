import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService.js';
import db from '../services/database.js';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        organizationId: string | null;
    };
}

/**
 * Auth Middleware
 * Verifies JWT access token and attaches full user info to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const authHeader = authReq.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = TokenService.verifyAccessToken(token);
        const user = await db.getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        authReq.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organization_id ?? null,
        };
        next();
    } catch (error) {
        logger.warn({ error }, 'Auth middleware: invalid or expired token');
        res.status(401).json({ error: 'Invalid or expired token.', code: 'TOKEN_EXPIRED' });
    }
};
