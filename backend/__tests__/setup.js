import { jest } from '@jest/globals';
import { Buffer } from 'buffer';
import process from 'node:process';

// Mock fs/promises
jest.mock('fs/promises', () => ({
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
    rename: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true })
}));

// Mock multer
const createMulterError = code => {
    const error = new Error('Multer error');
    error.code = code;
    error.name = 'MulterError';
    return error;
};

const multerMock = jest.fn().mockImplementation(() => ({
    single: jest.fn().mockImplementation(() => (req, res, next) => {
        if (req.mockMulterError) {
            next(createMulterError(req.mockMulterError));
            return;
        }
        next();
    })
}));
multerMock.MulterError = { code: createMulterError };

jest.mock('multer', () => multerMock);

// Mock clamscan
const mockScanner = {
    init: jest.fn().mockResolvedValue({
        scanFile: jest.fn().mockResolvedValue({
            isInfected: false,
            viruses: []
        })
    })
};
jest.mock('clamscan', () => jest.fn(() => mockScanner));

// Mock security middleware
const rateLimitMock = jest.fn(config => (req, res, next) => {
    res.setHeader('X-RateLimit-Limit', config?.max || 100);
    res.setHeader('X-RateLimit-Remaining', (config?.max || 100) - 1);
    next();
});

const helmetMock = jest.fn(() => (req, res, next) => {
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('x-xss-protection', '1; mode=block');
    res.setHeader('x-content-type-options', 'nosniff');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

jest.mock('express-rate-limit', () => rateLimitMock);
jest.mock('helmet', () => helmetMock);

// Export mocks for test use
export const mocks = {
    fs: require('fs/promises'),
    multer: require('multer'),
    clamscan: mockScanner,
    security: {
        rateLimit: rateLimitMock,
        helmet: helmetMock
    }
};