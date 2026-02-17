import Pusher from 'pusher-js';
import { useEffect, useRef, useState, useCallback } from 'react';

// Pusher configuration
const PUSHER_KEY = '1aaf0b4792f2a1ffd6fa';
const PUSHER_CLUSTER = 'ap2';

// API base URL - change this for production
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface PusherHookResult {
    isConnected: boolean;
    subscribe: (channelName: string) => void;
    unsubscribe: (channelName: string) => void;
    bind: (channelName: string, eventName: string, callback: (data: any) => void) => void;
    unbind: (channelName: string, eventName: string) => void;
}

export function usePusher(): PusherHookResult {
    const pusherRef = useRef<Pusher | null>(null);
    const channelsRef = useRef<Map<string, any>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Initialize Pusher
        pusherRef.current = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
        });

        pusherRef.current.connection.bind('connected', () => {
            setIsConnected(true);
            console.log('Pusher connected');
        });

        pusherRef.current.connection.bind('disconnected', () => {
            setIsConnected(false);
            console.log('Pusher disconnected');
        });

        return () => {
            pusherRef.current?.disconnect();
        };
    }, []);

    const subscribe = useCallback((channelName: string) => {
        if (!pusherRef.current) return;
        if (channelsRef.current.has(channelName)) return;

        const channel = pusherRef.current.subscribe(channelName);
        channelsRef.current.set(channelName, channel);
        console.log(`Subscribed to ${channelName}`);
    }, []);

    const unsubscribe = useCallback((channelName: string) => {
        if (!pusherRef.current) return;

        pusherRef.current.unsubscribe(channelName);
        channelsRef.current.delete(channelName);
        console.log(`Unsubscribed from ${channelName}`);
    }, []);

    const bind = useCallback((channelName: string, eventName: string, callback: (data: any) => void) => {
        const channel = channelsRef.current.get(channelName);
        if (channel) {
            channel.bind(eventName, callback);
        }
    }, []);

    const unbind = useCallback((channelName: string, eventName: string) => {
        const channel = channelsRef.current.get(channelName);
        if (channel) {
            channel.unbind(eventName);
        }
    }, []);

    return { isConnected, subscribe, unsubscribe, bind, unbind };
}

// API Helper functions
export const api = {
    baseUrl: API_BASE,

    async request(endpoint: string, options: RequestInit = {}) {
        const url = `${this.baseUrl}/${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    // Sessions
    async createSession(title: string, mode: string) {
        return this.request('sessions.php', {
            method: 'POST',
            body: JSON.stringify({ title, mode }),
        });
    },

    async validateSession(code: string) {
        return this.request(`sessions.php?action=validate&code=${code}`);
    },

    async joinSession(code: string, nickname: string) {
        return this.request('sessions.php?action=join', {
            method: 'POST',
            body: JSON.stringify({ code, nickname }),
        });
    },

    async getSessionDetails(sessionId: string) {
        return this.request(`sessions.php?action=details&id=${sessionId}`);
    },

    async updateSession(id: string, updates: any) {
        return this.request('sessions.php', {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        });
    },

    async endSession(sessionId: string) {
        return this.request(`sessions.php?id=${sessionId}`, {
            method: 'DELETE',
        });
    },

    // Questions
    async getQuestions(sessionId: string) {
        return this.request(`questions.php?session_id=${sessionId}`);
    },

    async createQuestion(data: any) {
        return this.request('questions.php', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async activateQuestion(questionId: string) {
        return this.request('questions.php?action=activate', {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId }),
        });
    },

    async lockQuestion(questionId: string) {
        return this.request('questions.php?action=lock', {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId }),
        });
    },

    async revealResults(questionId: string) {
        return this.request('questions.php?action=reveal', {
            method: 'POST',
            body: JSON.stringify({ question_id: questionId }),
        });
    },

    async deleteQuestion(questionId: string) {
        return this.request(`questions.php?id=${questionId}`, {
            method: 'DELETE',
        });
    },

    // Responses
    async submitResponse(data: any) {
        return this.request('responses.php', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getResponses(questionId: string) {
        return this.request(`responses.php?question_id=${questionId}`);
    },

    // Participants
    async getParticipants(sessionId: string) {
        return this.request(`participants.php?session_id=${sessionId}`);
    },

    async getLeaderboard(sessionId: string, limit = 10) {
        return this.request(`participants.php?action=leaderboard&session_id=${sessionId}&limit=${limit}`);
    },

    async removeParticipant(participantId: string) {
        return this.request('participants.php?action=remove', {
            method: 'POST',
            body: JSON.stringify({ participant_id: participantId }),
        });
    },
};

export default usePusher;
