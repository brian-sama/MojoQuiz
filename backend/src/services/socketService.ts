import type { Server } from 'socket.io';
import type { SocketEventName } from '../socket/events.js';

let io: Server | null = null;

function setIo(server: Server) {
    io = server;
}

function emitToSession(sessionId: string, event: SocketEventName | string, payload: unknown) {
    if (!io) return;
    io.to(`session:${sessionId}`).emit(event, payload);
}

export default {
    setIo,
    emitToSession,
};
