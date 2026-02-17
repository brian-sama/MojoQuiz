/**
 * Main Server Entry Point
 * Configures Express + Socket.IO server with session expiration management
 */

import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import app from './app.js';
import initializeSocketHandlers from './socket/socketHandler.js';
import { expireOldSessions } from './services/database.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '5') * 60 * 1000;

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

// Initialize socket handlers
initializeSocketHandlers(io);

// ============================================
// SESSION EXPIRATION MANAGER
// ============================================

class SessionExpirationManager {
    private intervalId: NodeJS.Timeout | null = null;

    start(): void {
        console.log(`🔄 Session expiration check running every ${CLEANUP_INTERVAL / 60000} minutes`);

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
                console.log(`⏰ Expired ${expiredCount} session(s)`);
            }
        } catch (error) {
            console.error('Error checking expired sessions:', error);
        }
    }
}

const expirationManager = new SessionExpirationManager();

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
    console.log('');
    console.log('🎯 ====================================');
    console.log('   ENGAGEMENT PLATFORM SERVER');
    console.log('====================================');
    console.log(`📡 HTTP Server:   http://localhost:${PORT}`);
    console.log(`🔌 WebSocket:     ws://localhost:${PORT}`);
    console.log(`🌐 CORS Origin:   ${CORS_ORIGIN}`);
    console.log(`📊 Health Check:  http://localhost:${PORT}/health`);
    console.log('====================================');
    console.log('');

    // Start session expiration manager
    expirationManager.start();
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop expiration manager
    expirationManager.stop();

    // Close Socket.IO connections
    io.close(() => {
        console.log('Socket.IO connections closed');

        // Close HTTP server
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { io, server };
