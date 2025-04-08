import request from 'supertest';
import express from 'express';
import { Buffer } from 'buffer';
import path from 'path';
import multer from 'multer';

/* global describe, beforeEach, it, expect */

const mockValidFile = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test file content'),
    size: 1024 * 50 // 50KB
};

describe('File Upload Security', () => {
    let app;
    const upload = multer({ storage: multer.memoryStorage() });

    const validateFile = (req, res, next) => {
        const file = req.file;
        if (file.size > 10 * 1024 * 1024) {
            return res.status(413).json({
                status: 'error',
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds limit of 10MB'
            });
        }
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(415).json({
                status: 'error',
                code: 'INVALID_FILE_TYPE',
                message: 'File type not allowed'
            });
        }
        next();
    };

    const sanitizeFilename = (req, res, next) => {
        if (req.file) {
            req.file.originalname = path.basename(req.file.originalname)
                .replace(/[^a-zA-Z0-9.-]/g, '_');
        }
        next();
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('File Size Validation', () => {
        it('should reject files larger than 10MB', async () => {
            const largeFile = {
                ...mockValidFile,
                size: 11 * 1024 * 1024
            };

            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = largeFile;
                next();
            }, validateFile, (req, res) => {
                res.status(200).json({ message: 'File accepted' });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'large.pdf')
                .expect(413);

            expect(response.body).toEqual({
                status: 'error',
                code: 'FILE_TOO_LARGE',
                message: 'File size exceeds limit of 10MB'
            });
        });

        it('should accept files within size limit', async () => {
            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = mockValidFile;
                next();
            }, validateFile, (req, res) => {
                res.status(200).json({ message: 'File accepted' });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'test.pdf')
                .expect(200);

            expect(response.body).toEqual({
                message: 'File accepted'
            });
        });
    });

    describe('File Type Validation', () => {
        it('should reject files with invalid MIME types', async () => {
            const invalidFile = {
                ...mockValidFile,
                mimetype: 'application/x-msdownload',
                originalname: 'test.exe'
            };

            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = invalidFile;
                next();
            }, validateFile, (req, res) => {
                res.status(200).json({ message: 'File accepted' });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'test.exe')
                .expect(415);

            expect(response.body).toEqual({
                status: 'error',
                code: 'INVALID_FILE_TYPE',
                message: 'File type not allowed'
            });
        });
    });

    describe('Filename Sanitization', () => {
        it('should sanitize filenames with special characters', async () => {
            const fileWithSpecialChars = {
                ...mockValidFile,
                originalname: '../../../etc/passwd;rm -rf /'
            };

            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = fileWithSpecialChars;
                next();
            }, sanitizeFilename, (req, res) => {
                res.status(200).json({ filename: req.file.originalname });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), '../../../etc/passwd;rm -rf /')
                .expect(200);

            expect(response.body.filename).toMatch(/^[a-zA-Z0-9._-]+$/);
            expect(response.body.filename).not.toContain('../');
            expect(response.body.filename).not.toContain(';');
        });
    });
});