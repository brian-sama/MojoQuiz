/**
 * Socket.IO Hook
 * Manages WebSocket connection and events
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UseSocketOptions {
    autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
    const { autoConnect = true } = options;
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize socket connection
    useEffect(() => {
        if (!autoConnect) return;

        const socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            setError('Connection failed. Please try again.');
            setIsConnected(false);
        });

        socket.on('error', (data: { code: string; message: string }) => {
            console.error('Socket error:', data);
            setError(data.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [autoConnect]);

    // Emit event
    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current) {
            socketRef.current.emit(event, data);
        }
    }, []);

    // Subscribe to event
    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.off(event, callback);
            }
        };
    }, []);

    // Unsubscribe from event
    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
        error,
        emit,
        on,
        off,
        clearError,
    };
}

export default useSocket;
