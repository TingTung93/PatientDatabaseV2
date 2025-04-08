import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises'; // For async file operations
// import crypto from 'crypto'; // No longer used here
// import { spawn } from 'child_process'; // No longer used here
import winston from 'winston';
import { fileURLToPath } from 'url';
import process from 'node:process';
import { processSingleCautionCard } from '../services/ocrProcessor.js'; // Import the refactored service
import db from '../database/db.js'; // Import the database connection (Knex instance)

const router = express.Router();
const __filename = fileURLToPath(import.meta.url); // ES Module equivalent
const __dirname = path.dirname(__filename); // ES Module equivalent
// Initialize logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: process.env.LOG_FILENAME || 'logs/app.log',
            level: 'error'
        }),
        new winston.transports.File({
            filename: process.env.LOG_FILENAME || 'logs/app.log'
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/caution-cards');
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
        // 1. Validate the uploaded file
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const filePath = req.file.path;
        const originalFilename = req.file.originalname;
        const mimeType = req.file.mimetype;
        // TODO: Get actual user ID from authentication context
        const userId = 1; // Placeholder

        // Call the refactored processing function
        const result = await processSingleCautionCard(filePath, originalFilename, mimeType, userId);

        // Send appropriate success response based on the result
        if (result.isOrphaned) {
            res.status(200).json({
                message: 'OCR processed. Patient not found. Submitted as orphaned item for review.',
                reviewItemId: result.reviewItemId,
                attachmentId: result.attachmentId,
                ocrData: result.ocrData, // Use the data returned by the service
                isOrphaned: true
            });
        } else {
             res.status(200).json({
                message: 'OCR processed and submitted for review successfully.',
                reviewItemId: result.reviewItemId,
                attachmentId: result.attachmentId,
                ocrData: result.ocrData // Use the data returned by the service
            });
        }

    } catch (error) {
        logger.error('Error processing OCR request:', error);
        res.status(500).json({
            error: 'Error',
            message: `Failed to process OCR: ${error.message}` // Provide more context
        });
    }
});

// Batch OCR processing endpoint
const MAX_BATCH_FILES = parseInt(process.env.MAX_BATCH_FILES || '20');
router.post('/batch-process', upload.array('files', MAX_BATCH_FILES), async (req, res) => {
    try {
        // 1. Validate input files
        if (!req.files || req.files.length === 0) {
            logger.warn('Batch process request received with no files.');
            return res.status(400).json({
                status: 'error',
                message: 'No files uploaded for batch processing.'
            });
        }

        // 2. Get User ID (assuming auth middleware sets req.user)
        // TODO: Replace with actual user ID retrieval from session/token
        const userId = req.user?.id || 1; // Placeholder: Use 1 if no user found for now
        if (!req.user?.id) {
             logger.warn(`Batch process initiated without authenticated user. Using placeholder ID: ${userId}`);
             // Depending on requirements, you might want to reject unauthenticated requests:
             // return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }

        logger.info(`User ID ${userId} initiated batch processing for ${req.files.length} files.`);

        // 3. Prepare job data for insertion
        const jobsToCreate = req.files.map(file => ({
            file_path: file.path, // The temporary path provided by multer
            original_name: file.originalname,
            mime_type: file.mimetype, // Add the mime type from the uploaded file
            status: 'queued', // Initial status
            user_id: userId,
            created_at: new Date(), // Set timestamps explicitly or rely on DB defaults
            updated_at: new Date()
        }));

        // 4. Insert jobs into the database
        // Use returning('id') if you want the IDs of the created jobs
        const createdJobs = await db('ocr_batch_jobs').insert(jobsToCreate).returning('id');

        logger.info(`Successfully queued ${createdJobs.length} jobs for user ID ${userId}. Job IDs: ${createdJobs.join(', ')}`);

        // 5. Send Accepted response
        res.status(202).json({
            status: 'success',
            message: `Accepted ${jobsToCreate.length} files for batch processing. Processing will occur asynchronously.`,
            jobIds: createdJobs, // Optionally return the IDs of the created jobs
            filesReceived: jobsToCreate.map(j => j.original_name)
        });

        // Note: Do NOT delete req.files here. The worker process needs them.
        // The existing error handler below will clean up if *this* initial queuing fails.


    } catch (error) {
         // Handle potential errors during initial upload handling (before queuing)
         // Multer errors (like file size limit) might be caught here or by a dedicated error handler.
        logger.error('Error handling batch OCR request:', error);
        // If files were uploaded but queuing failed, they might need cleanup.
        // Multer typically handles cleanup on its own errors, but custom errors need care.
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

// Placeholder for GET /api/v1/caution-cards
router.get('/', async (req, res, next) => {
  try {
    logger.info(`GET /api/v1/caution-cards called with query: ${JSON.stringify(req.query)}`);
    // TODO: Implement logic to fetch caution cards based on query params (page, limit, view)
    res.status(200).json({ data: [], total: 0 }); // Return empty array for now
  } catch (error) {
    logger.error('Error fetching caution cards:', error);
    next(error);
  }
});

// Placeholder for GET /api/v1/caution-cards/orphaned
router.get('/orphaned', async (req, res, next) => {
  try {
    logger.info(`GET /api/v1/caution-cards/orphaned called`);
    // TODO: Implement logic to fetch orphaned caution cards
    res.status(200).json([]); // Return empty array for now
  } catch (error) {
    logger.error('Error fetching orphaned caution cards:', error);
    next(error);
  }
});

// Get OCR results for a specific image
router.get('/results/:imageId', async (req, res) => {
    try {
        const imageId = req.params.imageId;
        const patientRepo = req.repositories.patient;
        
        // Find patient with this image
        const patient = await patientRepo.findByImageId(imageId);
        
        if (!patient) {
            return res.status(404).json({
                status: 'error',
                message: 'No OCR results found for this image'
            });
        }
        
        // Return patient data and OCR info
        return res.status(200).json({
            status: 'success',
            data: {
                patient,
                cautionCardData: patient.cautionCardData,
                ocrConfidence: patient.ocrConfidence || 'medium'
            }
        });
    } catch (err) {
        logger.error(`Error retrieving OCR results: ${err.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve OCR results',
            error: err.message
        });
    }
});

export default router;