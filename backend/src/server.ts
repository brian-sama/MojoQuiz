/**
 * Main Server Entry Point
 * Configures Express + Socket.IO server with session expiration management
 */

import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';

import app from './app.js';
import initializeSocketHandlers from './socket/socketHandler.js';
import { expireOldSessions } from './services/database.js';
import logger from './utils/logger.js';
import './services/WorkerService.js'; // Initialize the worker

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '5') * 60 * 1000;
const REDIS_URL = process.env.REDIS_URL;

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

/**
 * Configure Redis Adapter for Horizontal Scaling
 */
async function setupRedisAdapter() {
    if (!REDIS_URL) {
        logger.warn('REDIS_URL not found. Skipping Redis adapter setup (scaling disabled).');
        return;
    }

    try {
        const pubClient = createClient({ url: REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO Redis adapter connected and enabled.');
    } catch (error) {
        logger.error('❌ Failed to connect to Redis for Socket.IO adapter:', error);
    }
}

import { throttleEvents } from './middleware/socketThrottle.js';
import { TokenService } from './services/TokenService.js';

// Socket JWT Authentication for presenter connections
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const decoded = TokenService.verifyAccessToken(token);
            (socket as any).userId = decoded.userId;
            (socket as any).userRole = decoded.role;
        } catch {
            // Token invalid — still allow connection (participant may not have token)
            logger.warn({ socketId: socket.id }, 'Socket auth: invalid token provided');
        }
    }
    next();
});

// Initialize socket handlers with throttle
io.use(throttleEvents);
initializeSocketHandlers(io);

// ============================================
// SESSION EXPIRATION MANAGER
// ============================================

class SessionExpirationManager {
    private intervalId: NodeJS.Timeout | null = null;

    start(): void {
        logger.info(`🔄 Session expiration check running every ${CLEANUP_INTERVAL / 60000} minutes`);

        // Run immediately
        this.checkExpiredSessions();

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.checkExpiredSessions();
        }, CLEANUP_INTERVAL);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async checkExpiredSessions(): Promise<void> {
        try {
            const expiredCount = await expireOldSessions();
            if (expiredCount > 0) {
                logger.info(`⏰ Expired ${expiredCount} session(s)`);
            }
        } catch (error) {
            logger.error('Error checking expired sessions:', error);
        }
    }
}

const expirationManager = new SessionExpirationManager();

// ============================================
// START SERVER
// ============================================

async function bootstrap() {
    await setupRedisAdapter();

    server.listen(PORT, () => {
        logger.info('🎯 ====================================');
        logger.info('   ENGAGEMENT PLATFORM SERVER');
        logger.info('====================================');
        logger.info(`📡 HTTP Server:   http://localhost:${PORT}`);
        logger.info(`🔌 WebSocket:     ws://localhost:${PORT}`);
        logger.info(`🌐 CORS Origin:   ${CORS_ORIGIN}`);
        logger.info(`📊 Health Check:  http://localhost:${PORT}/health`);
        logger.info('====================================');

        // Start session expiration manager
        expirationManager.start();
    });
}

bootstrap().catch(err => {
    logger.fatal('Failed to bootstrap server:', err);
    process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    // Stop expiration manager
    expirationManager.stop();

    // Close Socket.IO connections
    io.close(() => {
        logger.info('Socket.IO connections closed');

        // Close HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { io, server };
