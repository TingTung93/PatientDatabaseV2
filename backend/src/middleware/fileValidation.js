import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import NodeClam from 'clamscan';
import config from '../config/upload.config.js';
import logger from '../utils/logger.js';

// Initialize ClamAV scanner
const clamscan = new NodeClam().init({
    removeInfected: true,
    quarantineInfected: false,
    scanLog: null,
    debugMode: false,
    fileList: null,
    scanTimeout: 60000,
    ...config.clamav
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.tempUploadDir);
    },
    filename: (req, file, cb) => {
        const safeFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${uuidv4()}-${safeFilename}`;
        cb(null, uniqueFilename);
    }
});

// File size and type validation
export const validateFile = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            status: 'error',
            code: 'NO_FILE',
            message: 'No file uploaded'
        });
    }

    // Size validation (10MB limit)
    if (req.file.size > config.maxFileSize) {
        return res.status(413).json({
            status: 'error',
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds limit of ${config.maxFileSize / (1024 * 1024)}MB`
        });
    }

    // MIME type validation
    if (!config.allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(415).json({
            status: 'error',
            code: 'INVALID_FILE_TYPE',
            message: 'File type not allowed'
        });
    }

    next();
};

// Virus scanning middleware
export const scanFile = async (req, res, next) => {
    try {
        const { file } = req;
        if (!file) return next();

        const { isInfected, viruses } = await (await clamscan).scanFile(file.path);
        
        if (isInfected) {
            return res.status(400).json({
                status: 'error',
                code: 'VIRUS_DETECTED',
                message: 'File is infected with malware',
                details: viruses
            });
        }

        next();
    } catch (error) {
        logger.error('Virus scan error:', error);
        return res.status(500).json({
            status: 'error',
            code: 'SCAN_ERROR',
            message: 'Error scanning file'
        });
    }
};

// Multer upload configuration
export const upload = multer({
    storage,
    limits: {
        fileSize: config.maxFileSize
    }
});

// File cleanup middleware
export const cleanupFile = async (req, res, next) => {
    const cleanup = () => {
        if (req.file) {
            fs.unlink(req.file.path).catch(err => {
                logger.error('File cleanup error:', err);
            });
        }
    };

    res.on('finish', cleanup);
    res.on('error', cleanup);
    next();
};

export default {
    upload,
    validateFile,
    scanFile,
    cleanupFile
};