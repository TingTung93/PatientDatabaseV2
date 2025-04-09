import { jest } from '@jest/globals';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import process from 'node:process';

// Test file constants
export const TEST_FILES = {
    VALID_IMAGE: {
        name: 'test-image.png',
        type: 'image/png',
        content: Buffer.from('fake image content'),
        size: 1024 * 100 // 100KB
    },
    LARGE_FILE: {
        name: 'large-file.png',
        type: 'image/png',
        content: Buffer.from('large file content'),
        size: 1024 * 1024 * 10 // 10MB
    },
    INVALID_TYPE: {
        name: 'test.pdf',
        type: 'application/pdf',
        content: Buffer.from('fake pdf content'),
        size: 1024 * 100
    }
};

// Mock implementations (hoisted)
const mockFsImplementation = {
    mkdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
    rename: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true })
};

const mockMulterImplementation = () => {
    const createMulterError = code => {
        const error = new Error('Multer error');
        error.code = code;
        error.name = 'MulterError';
        return error;
    };

    return () => ({
        single: () => (req, res, next) => {
            if (req.mockMulterError) {
                next(createMulterError(req.mockMulterError));
                return;
            }
            next();
        }
    });
};

const mockClamscanImplementation = ({ isInfected = false, viruses = [] } = {}) => {
    return () => ({
        init: () => Promise.resolve({
            scanFile: () => Promise.resolve({ isInfected, viruses })
        })
    });
};

// Security middleware mocks (hoisted)
export const mockSecurityImplementations = {
    rateLimit: config => (req, res, next) => {
        res.setHeader('X-RateLimit-Limit', config?.max || 100);
        res.setHeader('X-RateLimit-Remaining', (config?.max || 100) - 1);
        next();
    },
    helmet: () => (req, res, next) => {
        res.setHeader('x-frame-options', 'DENY');
        res.setHeader('x-xss-protection', '1; mode=block');
        res.setHeader('x-content-type-options', 'nosniff');
        if (process.env.NODE_ENV === 'production') {
            res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
        }
        next();
    }
};

// Helper functions to setup mocks
export function setupMockFs() {
    jest.mock('fs/promises', () => mockFsImplementation);
    return mockFsImplementation;
}

export function setupMockMulter() {
    const multerMock = jest.fn(mockMulterImplementation());
    multerMock.MulterError = class extends Error {
        constructor(code) {
            super('Multer error');
            this.code = code;
        }
    };
    jest.mock('multer', () => multerMock);
    return multerMock;
}

export function setupMockClamscan(options = {}) {
    const mockScanner = jest.fn(mockClamscanImplementation(options));
    jest.mock('clamscan', () => mockScanner);
    return mockScanner;
}

export function setupMockSecurity() {
    const rateLimitMock = jest.fn(mockSecurityImplementations.rateLimit);
    const helmetMock = jest.fn(mockSecurityImplementations.helmet);

    jest.mock('express-rate-limit', () => rateLimitMock);
    jest.mock('helmet', () => helmetMock);

    return { rateLimitMock, helmetMock };
}

export function createTestFile({
    name = TEST_FILES.VALID_IMAGE.name,
    content = TEST_FILES.VALID_IMAGE.content,
    type = TEST_FILES.VALID_IMAGE.type
} = {}) {
    return {
        originalname: name,
        buffer: content,
        mimetype: type,
        size: content.length,
        filename: `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${name.slice(name.lastIndexOf('.'))}`
    };
}

export function setupMockDb() {
    return {
        query: jest.fn(),
        transaction: jest.fn(async (callback) => {
            return callback({ query: jest.fn() });
        })
    };
}