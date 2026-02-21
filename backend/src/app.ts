import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import libraryRoutes from './routes/library.js';
import analyticsRoutes from './routes/analytics.js';
import sessionRoutes from './routes/sessions.js';
import questionRoutes from './routes/questions.js';
import adminRoutes from './routes/admin.js';
import { GeneralController } from './controllers/GeneralController.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

dotenv.config();

const app: Express = express();

// ============================================
// MIDDLEWARE
// ============================================

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
});

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ============================================
// ROUTES
// ============================================

app.get('/health', GeneralController.health);
app.get('/api/facts/youth', GeneralController.getTrivia);

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

// Compatibility alias for join (moved from root join to sessions/join)
app.use('/api/join', (req, res, next) => {
    req.url = `/join${req.url}`;
    sessionRoutes(req, res, next);
});

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler);

export default app;
