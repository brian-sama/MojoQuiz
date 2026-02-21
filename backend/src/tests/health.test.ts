import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('API Health & General', () => {
    it('GET /health should return 200 and ok status', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/facts/youth should return 200 and a text fact', async () => {
        const response = await request(app).get('/api/facts/youth');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('text');
    });
});
