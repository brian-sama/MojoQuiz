import { Request, Response, Router } from 'express';
import { authorize } from '../middleware/rbac.js';
import db from '../services/database.js';
import logger from '../utils/logger.js';

const router: Router = express.Router();

/**
 * GET /api/admin/users
 * List all users in the organization (or all if platform owner)
 */
router.get('/users', authorize(['admin', 'owner']), (async (req: Request, res: Response) => {
    try {
        const organizationId = req.user!.role === 'owner' ? undefined : req.user!.organizationId;

        // Note: db.getUsers needs to support orgId filtering
        const users = await db.getUsers(organizationId);

        res.json(users.map(u => ({
            id: u.id,
            email: u.email,
            displayName: u.display_name,
            role: u.role,
            organizationId: u.organizationId,
            lastLoginAt: u.last_login_at
        })));
    } catch (error) {
        logger.error({ error }, 'Admin: failed to fetch users');
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));

/**
 * PATCH /api/admin/users/:userId/role
 * Update a user's role
 */
router.patch('/users/:userId/role', authorize(['admin', 'owner']), (async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;

    const VALID_ROLES = ['owner', 'admin', 'presenter', 'analyst', 'user'];
    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const targetUser = await db.getUserById(userId);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Admin can only manage users in their own org
        if (req.user!.role === 'admin' && targetUser.organizationId !== req.user!.organizationId) {
            return res.status(403).json({ error: 'Can only manage users within your organization' });
        }

        // Prevent admin from promoting self/others to owner
        if (req.user!.role === 'admin' && role === 'owner') {
            return res.status(403).json({ error: 'Only owners can promote to owner' });
        }

        const updatedUser = await db.updateUser(userId, { role });

        await db.createAuditLog(req.user!.id, 'USER_ROLE_UPDATED', {
            targetUserId: userId,
            oldRole: targetUser.role,
            newRole: role
        });

        res.json({ id: updatedUser.id, role: updatedUser.role });
    } catch (error) {
        logger.error({ error, userId }, 'Admin: failed to update role');
        res.status(500).json({ error: 'Failed to update user role' });
    }
}));

/**
 * GET /api/admin/audit-logs
 * Fetch recent audit logs
 */
router.get('/audit-logs', authorize(['admin', 'owner']), (async (req: Request, res: Response) => {
    try {
        const organizationId = req.user!.role === 'owner' ? undefined : req.user!.organizationId;

        // Note: db.getAuditLogs needs to be implemented
        const logs = await db.getAuditLogs(organizationId, 50);

        res.json(logs);
    } catch (error) {
        logger.error({ error }, 'Admin: failed to fetch audit logs');
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
}));

export default router;
