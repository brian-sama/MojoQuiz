import { Request, Response, NextFunction } from 'express';
import db from '../services/database.js';
import logger from '../utils/logger.js';

/**
 * Role hierarchy for hierarchical authorization.
 * Higher number = more permissions.
 */
const ROLE_HIERARCHY: Record<string, number> = {
    user: 1,
    analyst: 2,
    presenter: 3,
    admin: 4,
    owner: 5,
};

/**
 * Middleware: require the user has one of the specified roles (or higher in hierarchy)
 */
export const requireRole = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify role from DB (don't trust JWT claim alone)
        const dbUser = await db.getUserById(req.user.id);
        if (!dbUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        const userLevel = ROLE_HIERARCHY[dbUser.role] ?? 0;
        const requiredLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r] ?? 0));

        if (allowedRoles.includes(dbUser.role) || userLevel >= requiredLevel) {
            // Update request user with verified role
            req.user.role = dbUser.role;
            next();
        } else {
            logger.warn({ userId: req.user.id, role: dbUser.role, required: allowedRoles }, 'RBAC: insufficient permissions');
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
};

/**
 * Middleware: require the user has one of the specified roles (exact match)
 */
export const authorize = (roles: string[]) => {
    return (async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    }) as any;
};

/**
 * Middleware: require the user belongs to an organization
 */
export const requireOrg = (async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.organizationId) {
        return res.status(400).json({ error: 'Organization membership required' });
    }

    next();
}) as any;

/**
 * Legacy authorize middleware — kept for backward compatibility with existing routes.
 * Combines authentication + role check in one middleware.
 */
export const authorizeLegacy = (allowedRoles: string[] = []) => {
    return (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Authorization required' });
            }

            const token = authHeader.split(' ')[1];
            const { TokenService } = await import('../services/TokenService.js');
            const decoded = TokenService.verifyAccessToken(token);

            const user = await db.getUserById(decoded.userId);
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId ?? null,
            };

            if (allowedRoles.length > 0) {
                const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
                const requiredLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r] ?? 0));

                if (!allowedRoles.includes(user.role) && userLevel < requiredLevel) {
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
            }

            next();
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(401).json({ error: 'Invalid token' });
        }
    }) as any;
};
