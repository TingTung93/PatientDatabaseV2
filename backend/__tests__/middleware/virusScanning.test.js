import request from 'supertest';
import express from 'express';
import { Buffer } from 'buffer';
import multer from 'multer';
import { mocks } from '../setup.js';

/* global describe, beforeEach, it, expect */

const mockValidFile = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test file content'),
    size: 1024 * 50, // 50KB
    path: '/tmp/test.pdf'
};

describe('Virus Scanning Middleware', () => {
    let app;
    const upload = multer({ storage: multer.memoryStorage() });

    const scanFile = async (req, res, next) => {
        try {
            const { file } = req;
            if (!file) return next();

            if (!file.path) {
                throw new Error('Invalid file path');
            }

            // Simulate virus scan
            const result = await Promise.resolve({
                isInfected: mocks.clamscan.isInfected,
                viruses: mocks.clamscan.viruses
            });
            
            if (result.isInfected) {
                return res.status(400).json({
                    status: 'error',
                    code: 'VIRUS_DETECTED',
                    message: 'File is infected with malware',
                    details: result.viruses
                });
            }

            next();
        } catch (error) {
            // Use error parameter in message to satisfy ESLint
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return res.status(500).json({
                status: 'error',
                code: 'SCAN_ERROR',
                message: `Error scanning file: ${errorMsg}`
            });
        }
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        mocks.clamscan.isInfected = false;
        mocks.clamscan.viruses = [];
    });

    describe('Virus Detection', () => {
        it('should reject files that contain malware', async () => {
            // Configure mock to simulate infected file
            mocks.clamscan.isInfected = true;
            mocks.clamscan.viruses = ['EICAR-Test'];

            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = mockValidFile;
                next();
            }, scanFile, (req, res) => {
                res.status(200).json({ message: 'File accepted' });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'test.pdf')
                .expect(400);

            expect(response.body).toEqual({
                status: 'error',
                code: 'VIRUS_DETECTED',
                message: 'File is infected with malware',
                details: ['EICAR-Test']
            });
        });

        it('should accept files that pass virus scan', async () => {
            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = mockValidFile;
                next();
            }, scanFile, (req, res) => {
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

        it('should handle missing files gracefully', async () => {
            app.post('/upload', upload.single('file'), scanFile, (req, res) => {
                res.status(200).json({ message: 'No file to scan' });
            });

            const response = await request(app)
                .post('/upload')
                .expect(200);

            expect(response.body).toEqual({
                message: 'No file to scan'
            });
        });

        it('should handle scanning errors gracefully', async () => {
            app.post('/upload', upload.single('file'), (req, res, next) => {
                req.file = {
                    ...mockValidFile,
                    // Force an error by using an invalid path
                    path: null
                };
                next();
            }, scanFile, (req, res) => {
                res.status(200).json({ message: 'File accepted' });
            });

            const response = await request(app)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'test.pdf')
                .expect(500);

            expect(response.body).toEqual({
                status: 'error',
                code: 'SCAN_ERROR',
                message: 'Error scanning file: Invalid file path'
            });
        });
    });
});