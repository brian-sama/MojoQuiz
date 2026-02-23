import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../services/database.js';
import { TokenService } from '../services/TokenService.js';
import { emailService } from '../services/emailService.js';
import { sanitizeInput } from '../utils/helpers.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import logger from '../utils/logger.js';

const router: Router = express.Router();

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// ============================================
// Zod Validation Schemas
// ============================================

const RegisterSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100).optional(),
});

const LoginSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(1, 'Password is required').max(128),
});

const ForgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
});

const ResetPasswordSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    code: z.string().length(6, 'Code must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

/**
 * Register
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const validation = RegisterSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { email, password, displayName } = validation.data;

        const existingUser = await db.getUserByEmail(email);
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        if (!password || !displayName) {
            return res.status(200).json({ message: 'New user check successful', requiresSetup: true });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const name = sanitizeInput(displayName);

        const user = await db.createUser({
            email: email.toLowerCase(),
            password_hash: passwordHash,
            display_name: name,
            auth_provider: 'email',
            is_verified: true,
            role: 'user'
        });

        const accessToken = TokenService.generateAccessToken(user.id, user.role);
        const refreshToken = await TokenService.generateRefreshToken(user.id);

        await db.createAuditLog(user.id, 'USER_REGISTERED', { email: user.email });

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken,
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });

    } catch (error) {
        logger.error({ error }, 'Registration error');
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * Login
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { email, password } = validation.data;

        const user = await db.getUserByEmail(email);

        if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        await db.updateUser(user.id, { last_login_at: new Date() });

        const accessToken = TokenService.generateAccessToken(user.id, user.role);
        const refreshToken = await TokenService.generateRefreshToken(user.id);

        await db.createAuditLog(user.id, 'USER_LOGIN', { email: user.email });

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            accessToken,
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });
    } catch (error) {
        logger.error({ error }, 'Login error');
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * Token Refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });

        const { accessToken, refreshToken: newRefreshToken } = await TokenService.rotateTokens(refreshToken);

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken, token: accessToken });
    } catch (error) {
        logger.error({ error }, 'Refresh token error');
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
        res.status(401).json({ error: error instanceof Error ? error.message : 'Failed to refresh token' });
    }
});

/**
 * Logout
 */
router.post('/logout', async (req: Request, res: Response) => {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (refreshToken) {
        await TokenService.revokeToken(refreshToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    res.json({ success: true });
});

/**
 * Forgot Password
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const validation = ForgotPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { email } = validation.data;

        const user = await db.getUserByEmail(email);
        if (!user) return res.json({ message: 'If an account exists, a reset code has been sent' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await db.createAuthToken({
            user_id: user.id,
            email: user.email,
            token_type: 'password_reset',
            code,
            expires_at: expiresAt
        });

        await emailService.sendPasswordReset(email, code);
        res.json({ message: 'If an account exists, a reset code has been sent' });
    } catch (error) {
        logger.error({ error }, 'Forgot password error');
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * Reset Password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const validation = ResetPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { email, code, newPassword } = validation.data;

        const token = await db.getValidAuthToken(email, code, 'password_reset');
        if (!token) return res.status(400).json({ error: 'Invalid or expired code' });

        const user = await db.getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.updateUser(user.id, { password_hash: passwordHash });
        await db.markAuthTokenUsed(token.id);

        // Revoke all existing refresh tokens (force re-login)
        await TokenService.revokeAllUserTokens(user.id);

        await db.createAuditLog(user.id, 'PASSWORD_RESET', { email: user.email });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        logger.error({ error }, 'Reset password error');
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * Get Me (current user profile)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const user = await db.getUserById(req.user!.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            role: user.role,
            organizationId: user.organizationId
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
