import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import process from 'node:process';
import { setupMockSecurity } from '../helpers/testUtils.js';

/* global describe, beforeEach, beforeAll, it, expect */

describe('Security Middleware', () => {
    let testApp;
    let securityMocks;

    beforeAll(() => {
        securityMocks = setupMockSecurity();
    });

    beforeEach(() => {
        testApp = express();
        jest.clearAllMocks();
    });

    describe('Helmet Security Headers', () => {
        beforeEach(() => {
            testApp.use(securityMocks.helmetMock());
        });

        it('should set security headers', async () => {
            testApp.get('/test', (req, res) => res.send('ok'));

            const res = await request(testApp)
                .get('/test')
                .expect(200);

            // Check essential security headers are set
            expect(res.headers).toHaveProperty('x-dns-prefetch-control');
            expect(res.headers).toHaveProperty('x-frame-options');
            expect(res.headers).toHaveProperty('x-download-options');
            expect(res.headers).toHaveProperty('x-content-type-options');
            expect(res.headers).toHaveProperty('x-xss-protection');
        });

        it('should set strict-transport-security header in production', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            testApp.use(securityMocks.helmetMock());
            testApp.get('/test', (req, res) => res.send('ok'));

            const res = await request(testApp)
                .get('/test')
                .expect(200);

            expect(res.headers).toHaveProperty('strict-transport-security');
            
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
            testApp.use(securityMocks.rateLimitMock(rateLimitConfig));
            testApp.get('/test', (req, res) => res.send('ok'));
        });

        it('should initialize rate limiter with correct config', async () => {
            await request(testApp)
                .get('/test')
                .expect(200);

            expect(securityMocks.rateLimitMock).toHaveBeenCalledWith(expect.objectContaining({
                windowMs: rateLimitConfig.windowMs,
                max: rateLimitConfig.max
            }));
        });

        it('should allow requests within rate limit', async () => {
            // Mock rate limiter to track requests but not block
            securityMocks.rateLimitMock.mockImplementation(() => (req, res, next) => {
                res.setHeader('X-RateLimit-Limit', 100);
                res.setHeader('X-RateLimit-Remaining', 99);
                next();
            });

            const res = await request(testApp)
                .get('/test')
                .expect(200);

            expect(res.headers).toHaveProperty('x-ratelimit-limit', '100');
            expect(res.headers).toHaveProperty('x-ratelimit-remaining', '99');
        });

        it('should block requests when rate limit exceeded', async () => {
            // Mock rate limiter to simulate limit exceeded
            // Configure rate limiter to simulate limit exceeded
            securityMocks.rateLimitMock.mockImplementation(() => (_, res) => {
                res.status(429).json({
                    status: 'error',
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests, please try again later.'
                });
            });

            const res = await request(testApp)
                .get('/test')
                .expect(429);

            expect(res.body.message).toBe('Too many requests, please try again later.');
        });
    });
});