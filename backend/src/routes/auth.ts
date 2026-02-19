import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../services/database.js';
import { emailService } from '../services/emailService.js';
import { sanitizeInput } from '../utils/helpers.js';

const router: Router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * Register (Simplified - No OTP)
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, displayName } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const existingUser = await db.getUserByEmail(email);

        // If user already exists, return "User already exists" error.
        // This is caught by the frontend to switch to the password step.
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // If it's just an existence check from the login page, return success.
        // If it's a registration attempt, ensure all fields are present.
        if (!password || !displayName) {
            return res.status(200).json({
                message: 'New user check successful',
                requiresSetup: true
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const name = sanitizeInput(displayName);

        // Create verified user immediately
        const user = await db.createUser({
            email: email.toLowerCase(),
            password_hash: passwordHash,
            display_name: name,
            auth_provider: 'email',
            is_verified: true,
            role: 'user'
        });

        // Generate Token
        const jwtToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await db.getUserByEmail(email);
        if (!user || !user.password_hash || !user.is_verified) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        await db.updateUser(user.id, { last_login_at: new Date() });

        const jwtToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * Forgot Password
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await db.getUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account exists, a reset code has been sent' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

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
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Email, code, and new password are required' });
        }

        const token = await db.getValidAuthToken(email, code, 'password_reset');
        if (!token) return res.status(400).json({ error: 'Invalid or expired code' });

        const user = await db.getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.updateUser(user.id, { password_hash: passwordHash });
        await db.markAuthTokenUsed(token.id);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * Get Me
 * GET /api/auth/me
 */
router.get('/me', async (req: any, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await db.getUserById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            role: user.role
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
