import { Socket } from 'socket.io';
import logger from '../utils/logger.js';

// Configuration for throttling
const THROTTLE_WINDOW_MS = 1000; // 1 second
const MAX_EVENTS_PER_WINDOW = 5;

const socketEventTimestamps: Map<string, number[]> = new Map();

/**
 * Socket.IO middleware for event throttling
 */
export const throttleEvents = (socket: Socket, next: (err?: any) => void) => {
    socket.onAny((eventName) => {
        // We only throttle data-heavy or broadcast-critical events
        const criticalEvents = ['submit_response', 'submit_brainstorm_idea', 'vote_brainstorm_idea'];
        if (!criticalEvents.includes(eventName)) return;

        const now = Date.now();
        const socketId = socket.id;
        const key = `${socketId}:${eventName}`;

        let timestamps = socketEventTimestamps.get(key) || [];

        // Filter out timestamps outside the window
        timestamps = timestamps.filter(t => now - t < THROTTLE_WINDOW_MS);

        if (timestamps.length >= MAX_EVENTS_PER_WINDOW) {
            logger.warn(`⚠️ Throttling event "${eventName}" from socket ${socketId}`);
            // Optionally, we could emit an error back to the client
            // socket.emit('error', { message: 'Too many requests, please slow down.' });
            return;
        }

        timestamps.push(now);
        socketEventTimestamps.set(key, timestamps);
    });

    next();
};

// Cleanup task for the timestamp map to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of socketEventTimestamps.entries()) {
        const filtered = timestamps.filter(t => now - t < THROTTLE_WINDOW_MS);
        if (filtered.length === 0) {
            socketEventTimestamps.delete(key);
        } else {
            socketEventTimestamps.set(key, filtered);
        }
    }
}, 60000); // Clean every minute
