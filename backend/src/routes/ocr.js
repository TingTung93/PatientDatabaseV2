import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import winston from 'winston';
import { fileURLToPath } from 'url';
import process from 'node:process';
import { processSingleCautionCard } from '../services/OcrService.js';
import db from '../database/db.js';
import logger from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/caution-cards');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueFilename = `card_image-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and TIF files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: fileFilter
});

// OCR processing endpoint
router.post('/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const filePath = req.file.path;
        const originalFilename = req.file.originalname;
        const mimeType = req.file.mimetype;
        const userId = req.user?.id || 1; // TODO: Replace with proper auth

        const result = await processSingleCautionCard(filePath, originalFilename, mimeType, userId);

        if (result.isOrphaned) {
            res.status(200).json({
                message: 'OCR processed. Patient not found. Submitted as orphaned item for review.',
                reviewItemId: result.reviewItemId,
                attachmentId: result.attachmentId,
                ocrData: result.ocrData,
                isOrphaned: true
            });
        } else {
             res.status(200).json({
                message: 'OCR processed and submitted for review successfully.',
                reviewItemId: result.reviewItemId,
                attachmentId: result.attachmentId,
                ocrData: result.ocrData
            });
        }

    } catch (error) {
        logger.error('Error processing OCR request:', error);
        res.status(500).json({
            error: 'Error',
            message: `Failed to process OCR: ${error.message}`
        });
    }
});

// Batch OCR processing endpoint
const MAX_BATCH_FILES = parseInt(process.env.MAX_BATCH_FILES || '20');
router.post('/batch-process', upload.array('files', MAX_BATCH_FILES), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            logger.warn('Batch process request received with no files.');
            return res.status(400).json({
                status: 'error',
                message: 'No files uploaded for batch processing.'
            });
        }

        const userId = req.user?.id || 1;
        if (!req.user?.id) {
             logger.warn(`Batch process initiated without authenticated user. Using placeholder ID: ${userId}`);
        }

        logger.info(`User ID ${userId} initiated batch processing for ${req.files.length} files.`);

        const jobsToCreate = req.files.map(file => ({
            file_path: file.path,
            original_name: file.originalname,
            mime_type: file.mimetype,
            status: 'queued',
            user_id: userId,
            created_at: new Date(),
            updated_at: new Date()
        }));

        const createdJobs = await db('ocr_batch_jobs').insert(jobsToCreate).returning('id');

        logger.info(`Successfully queued ${createdJobs.length} jobs for user ID ${userId}. Job IDs: ${createdJobs.join(', ')}`);

        res.status(202).json({
            status: 'success',
            message: `Accepted ${jobsToCreate.length} files for batch processing. Processing will occur asynchronously.`,
            jobIds: createdJobs,
            filesReceived: jobsToCreate.map(j => j.original_name)
        });

    } catch (error) {
        logger.error('Error handling batch OCR request:', error);
        if (req.files && req.files.length > 0) {
            logger.warn(`Attempting cleanup for ${req.files.length} files after batch processing error.`);
            for (const file of req.files) {
                try {
                    await fsPromises.unlink(file.path);
                    logger.info(`Cleaned up temporary file: ${file.path}`);
                } catch (unlinkErr) {
                    logger.error(`Error cleaning up file ${file.path} after batch error:`, unlinkErr);
                }
            }
        }
        res.status(500).json({
            error: 'Error',
            message: `Failed to initiate batch processing: ${error.message}`
        });
    }
});

export default router; 