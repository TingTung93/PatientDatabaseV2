import { jest } from '@jest/globals';

// Setup mocks with inline factory functions
jest.mock('express-rate-limit', () => {
    const fn = jest.fn((config) => (req, res, next) => {
        res.setHeader('X-RateLimit-Limit', config?.max || 100);
        res.setHeader('X-RateLimit-Remaining', (config?.max || 100) - 1);
        next();
    });
    return fn;
});

jest.mock('helmet', () => {
    const fn = jest.fn(() => (req, res, next) => {
        res.setHeader('x-frame-options', 'DENY');
        res.setHeader('x-xss-protection', '1; mode=block');
        res.setHeader('x-content-type-options', 'nosniff');
        res.setHeader('x-dns-prefetch-control', 'off');
        res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
        next();
    });
    return fn;
});

jest.mock('fs/promises', () => ({
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('test file content'),
    rename: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true })
}));

// Create state container for clamscan mock
const clamscanState = { isInfected: false, viruses: [] };

jest.mock('clamscan', () => {
    return jest.fn(() => ({
        init: jest.fn().mockResolvedValue({
            scanFile: jest.fn().mockImplementation(async () => ({
                isInfected: clamscanState.isInfected,
                viruses: clamscanState.viruses
            }))
        })
    }));
});

// Export mocks for test use
export const mocks = {
    security: {
        rateLimit: jest.requireMock('express-rate-limit'),
        helmet: jest.requireMock('helmet')
    },
    fs: jest.requireMock('fs/promises'),
    clamscan: clamscanState
};