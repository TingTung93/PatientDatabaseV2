const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { validateReport } = require('../services/reportValidator');
const { parseReport } = require('../services/reportParser');
const ReportStorageService = require('../services/reportStorageService');
const logger = require('../utils/logger');

// Configure multer for report uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/reports');
        // Ensure upload directory exists
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `report-${timestamp}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Accept only text files for now
        if (file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all reports with pagination
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const reports = await ReportStorageService.getAllReports(page, limit);
        
        res.json({
            status: 'success',
            data: reports.items,
            pagination: {
                page,
                limit,
                total: reports.total,
                totalPages: Math.ceil(reports.total / limit),
                hasNextPage: page < Math.ceil(reports.total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        logger.error('Error fetching reports:', error);
        next(error);
    }
});

// Report upload endpoint
router.post('/upload', upload.single('report'), async (req, res, next) => {
    let transaction;
    
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No report file uploaded'
            });
        }

        logger.info(`Processing report file: ${req.file.filename}`);

        // Read the uploaded file
        const fileContent = await fs.readFile(req.file.path, 'utf8');

        // Parse the report
        const parsedReport = await parseReport(fileContent);

        // Validate the parsed data
        const validationResult = await validateReport(parsedReport);

        if (!validationResult.isValid) {
            return res.status(400).json({
                status: 'error',
                message: 'Report validation failed',
                errors: validationResult.errors
            });
        }

        // Store the report data
        const storageResult = await ReportStorageService.storeReport(
            parsedReport,
            fileContent,
            req.file.originalname,
            req.user?.id // Optional user ID if authentication is implemented
        );

        res.json({
            status: 'success',
            message: 'Report processed and stored successfully',
            data: {
                reportId: storageResult.reportId,
                metadata: parsedReport.metadata,
                patientCount: storageResult.patientCount,
                facility: parsedReport.metadata.facility
            }
        });

    } catch (error) {
        logger.error('Error processing report:', error);
        next(error);
    } finally {
        // Clean up the uploaded file
        if (req.file) {
            fs.unlink(req.file.path).catch(err => 
                logger.error('Error deleting uploaded file:', err)
            );
        }
    }
});

// Get report by ID
router.get('/:reportId', async (req, res, next) => {
    try {
        const report = await ReportStorageService.getReportById(req.params.reportId);
        res.json({
            status: 'success',
            data: report
        });
    } catch (error) {
        next(error);
    }
});

// Get reports by facility
router.get('/facility/:facilityId', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const reports = await ReportStorageService.getReportsByFacility(
            req.params.facilityId,
            page,
            limit
        );
        
        res.json({
            status: 'success',
            data: reports
        });
    } catch (error) {
        next(error);
    }
});

// Search patients
router.get('/patients/search', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const searchParams = {
            lastName: req.query.lastName,
            firstName: req.query.firstName,
            medicalRecordNumber: req.query.mrn,
            bloodType: req.query.bloodType
        };
        
        const patients = await ReportStorageService.searchPatients(
            searchParams,
            page,
            limit
        );
        
        res.json({
            status: 'success',
            data: patients
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 