/**
 * API Hook & Helper
 * Manages REST API calls and common operations
 */

import { useState, useCallback } from 'react';

// API base URL - change this for production
const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = {
    baseUrl: API_BASE,

    async request(endpoint: string, options: RequestInit = {}) {
        // Ensure endpoint doesn't start with / if baseUrl ends with it, or vice versa
        const separator = this.baseUrl.endsWith('/') || endpoint.startsWith('/') ? '' : '/';
        const url = `${this.baseUrl}${separator}${endpoint}`;

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
    async createSession(title: string, mode: string, presenterId: string) {
        return this.request('sessions', {
            method: 'POST',
            body: JSON.stringify({ title, mode, presenterId }),
        });
    },

    async validateSession(code: string) {
        return this.request(`sessions/${code.toUpperCase()}`);
    },

    async joinSession(code: string, _nickname: string) {
        return this.request(`join/${code.toUpperCase()}`);
    },

    async getSessionDetails(sessionId: string) {
        // In the new backend, we use joinCode or sessionId for info
        // Most session info is fetched via Socket.IO join events now, 
        // but we'll map this to the session info endpoint
        return this.request(`sessions/${sessionId}`);
    },

    async updateSession(id: string, updates: any) {
        return this.request(`sessions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    async endSession(sessionId: string) {
        return this.request(`sessions/${sessionId}/end`, {
            method: 'POST',
        });
    },

    // Questions
    async getQuestions(sessionId: string) {
        return this.request(`sessions/${sessionId}/questions`);
    },

    async createQuestion(sessionId: string, data: any) {
        return this.request(`sessions/${sessionId}/questions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async extractQuestions(sessionId: string, sourceText: string) {
        return this.request(`sessions/${sessionId}/extract-questions`, {
            method: 'POST',
            body: JSON.stringify({ sourceText }),
        });
    },

    // Results
    async submitResponse(_data: any) {
        // New backend handles responses via Socket.IO
        console.warn('submitResponse: This operation is now handled by Socket.IO');
        return Promise.resolve({ success: true });
    },

    async getResults(questionId: string) {
        return this.request(`questions/${questionId}/results`);
    },

    // Leaderboard
    async getLeaderboard(sessionId: string, limit = 10) {
        return this.request(`sessions/${sessionId}/leaderboard?limit=${limit}`);
    },
};

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (apiCall: () => Promise<any>) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall();
            return result;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, execute, api };
}

export default useApi;
