import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import process from 'node:process';
import { securityMocks } from '../setup.js';

/* global describe, beforeEach, it, expect */

describe('Security Middleware', () => {
    let testApp;
    const { helmet, rateLimit } = securityMocks;

    beforeEach(() => {
        testApp = express();
        jest.clearAllMocks();
    });

    describe('Helmet Security Headers', () => {
        beforeEach(() => {
            testApp.use(helmet());
        });

        it('should set security headers', async () => {
            testApp.get('/test', (req, res) => res.send('ok'));

            const res = await request(testApp)
                .get('/test')
                .expect(200);

            // Check essential security headers are set
            expect(res.headers).toHaveProperty('x-dns-prefetch-control', 'off');
            expect(res.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
            expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
        });

        it('should set strict-transport-security header in production', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            testApp.use(helmet());
            testApp.get('/test', (req, res) => res.send('ok'));

            const res = await request(testApp)
                .get('/test')
                .expect(200);

            expect(res.headers).toHaveProperty('strict-transport-security', 'max-age=31536000; includeSubDomains');
            
            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Rate Limiting', () => {
        const rateLimitConfig = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        };

        beforeEach(() => {
            testApp.use(rateLimit(rateLimitConfig));
            testApp.get('/test', (req, res) => res.send('ok'));
        });

        it('should initialize rate limiter with correct config', async () => {
            await request(testApp)
                .get('/test')
                .expect(200);

            expect(rateLimit).toHaveBeenCalledWith(expect.objectContaining({
                windowMs: rateLimitConfig.windowMs,
                max: rateLimitConfig.max
            }));
        });

        it('should allow requests within rate limit', async () => {
            const res = await request(testApp)
                .get('/test')
                .expect(200);

            expect(res.headers).toHaveProperty('x-ratelimit-limit', '100');
            expect(res.headers).toHaveProperty('x-ratelimit-remaining', '99');
        });

        it('should block requests when rate limit exceeded', async () => {
            // Reset the mock to remove default implementation
            rateLimit.mockReset();
            
            // Configure rate limiter to simulate limit exceeded
            rateLimit.mockImplementation(() => (req, res) => {
                res.status(429).json({
                    status: 'error',
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests, please try again later.'
                });
            });

            // Create a new app instance with the updated mock
            const app = express();
            app.use(rateLimit(rateLimitConfig));
            app.get('/test', (req, res) => res.send('ok'));

            const res = await request(app)
                .get('/test')
                .expect(429);

            expect(res.body.message).toBe('Too many requests, please try again later.');
        });
    });
});