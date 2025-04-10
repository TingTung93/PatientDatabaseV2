import express from 'express';
const router = express.Router();
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises'; // Use promises version of fs
import { fileURLToPath } from 'url'; // Needed for __dirname replacement
import { validateReport } from '../services/reportValidator.js'; // Add .js extension
import { parseReport, processReport, storeReportJson, processPatientData } from '../utils/reportParser.js'; // Import processPatientData
import ReportStorageService from '../services/reportStorageService.js'; // Add .js extension
import { log } from '../utils/logging.js'; // Use the log export instead of logger
import { db } from '../database/init.js'; // Correct import for the database
import { queryExec, queryRun, queryGet, migrateReportData } from '../utils/dbHelper.js';

const __filename = fileURLToPath(import.meta.url); // ES Module equivalent for __filename
const __dirname = path.dirname(__filename); // ES Module equivalent for __dirname

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
        log.error('Error fetching reports:', error);
        next(error);
    }
});

// Add a new route to test the SQLite connection
router.get('/test-db-connection', async (req, res, next) => {
    try {
        log.info('Starting database connection test');
        
        // Check if the database is initialized
        if (!db.instance) {
            return res.status(500).json({
                status: 'error',
                message: 'Database is not initialized'
            });
        }
        
        // First run our migration to fix any potential structure issues
        await migrateReportData();
        
        // Test a simple query to verify connection
        const result = await queryGet('SELECT sqlite_version() as version');
        
        // Test creating a temporary table for further validation
        await queryExec(`
            CREATE TABLE IF NOT EXISTS db_test (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert a test row
        const insertResult = await queryRun(
            'INSERT INTO db_test (test_value) VALUES (?)',
            [`Test at ${new Date().toISOString()}`]
        );
        
        // Read the inserted row
        const testRow = await queryGet(
            'SELECT * FROM db_test WHERE id = ?',
            [insertResult.lastID]
        );
        
        return res.json({
            status: 'success',
            message: 'Database connection successful',
            data: {
                sqlite_version: result.version,
                test_insert: {
                    id: insertResult.lastID,
                    row: testRow
                }
            }
        });
    } catch (error) {
        log.error('Error testing database connection:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Report upload endpoint
router.post('/upload', upload.single('report'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No report file uploaded'
            });
        }

        log.info(`Processing report file: ${req.file.filename}`);

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

        try {
            // Use the simplified JSON storage approach
            log.info('Using simplified JSON storage for report');
            const storageResult = await storeReportJson(parsedReport, req.file.originalname);
            
            return res.json({
                status: 'success',
                message: 'Report processed and stored successfully',
                data: {
                    reportId: storageResult.reportId,
                    patientCount: storageResult.patientCount,
                    metadata: parsedReport.metadata,
                    facility: parsedReport.metadata.facility
                }
            });
        } catch (storageError) {
            log.error(`Error storing report: ${storageError.message}`);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to store report data',
                error: storageError.message
            });
        }
    } catch (error) {
        log.error('Error processing report:', error);
        next(error);
    } finally {
        // Clean up the uploaded file
        if (req.file) {
            fs.unlink(req.file.path).catch(err => 
                log.error('Error deleting uploaded file:', err)
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

// New route for already parsed report data
router.post('/parsed', express.json(), async (req, res, next) => {
    try {
        const parsedReport = req.body;
        
        if (!parsedReport || !parsedReport.metadata || !Array.isArray(parsedReport.patients)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid report data format'
            });
        }

        log.info(`Processing pre-parsed report with ${parsedReport.patients.length} patients`);

        // Validate the parsed data
        const validationResult = await validateReport(parsedReport);

        if (!validationResult.isValid) {
            return res.status(400).json({
                status: 'error',
                message: 'Report validation failed',
                errors: validationResult.errors
            });
        }

        try {
            // Use the simplified JSON storage approach
            log.info('Using simplified JSON storage for pre-parsed report');
            const storageResult = await storeReportJson(parsedReport, 'direct-upload.json');
            
            return res.json({
                status: 'success',
                message: 'Pre-parsed report processed and stored successfully',
                data: {
                    reportId: storageResult.reportId,
                    patientCount: storageResult.patientCount,
                    metadata: parsedReport.metadata,
                    facility: parsedReport.metadata.facility
                }
            });
        } catch (storageError) {
            log.error(`Error storing pre-parsed report: ${storageError.message}`);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to store report data',
                error: storageError.message
            });
        }
    } catch (error) {
        log.error('Error processing pre-parsed report:', error);
        next(error);
    }
});

// New simplified test endpoint - just save to SQLite directly
router.post('/test-sqlite', async (req, res, next) => {
    try {
        log.info('Testing SQLite storage directly');
        
        // Check if database is initialized
        if (!db.instance) {
            return res.status(500).json({
                status: 'error',
                message: 'Database is not initialized'
            });
        }
        
        // Initialize tables if needed
        try {
            await queryExec(`
                CREATE TABLE IF NOT EXISTS test_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    facility_id TEXT,
                    facility TEXT,
                    report_date TEXT,
                    report_type TEXT,
                    location TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await queryExec(`
                CREATE TABLE IF NOT EXISTS test_patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    medical_record_number TEXT,
                    dob TEXT,
                    blood_type TEXT,
                    comments TEXT,
                    report_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (report_id) REFERENCES test_reports(id)
                )
            `);
        } catch (tableError) {
            log.error('Error creating test tables:', tableError);
            // Continue anyway - tables might already exist
        }
        
        // Insert a simple test record
        try {
            const reportResult = await queryRun(`
                INSERT INTO test_reports (
                    facility_id, facility, report_date, report_type, location
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                '0067-BB',
                '0067A',
                new Date().toISOString().split('T')[0],
                'TEST',
                'MAIN'
            ]);
            
            const reportId = reportResult.lastID;
            
            // Insert a test patient record
            await queryRun(`
                INSERT INTO test_patients (
                    name, medical_record_number, dob, blood_type, comments, report_id
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'Test Patient',
                '123456789',
                '2000-01-01',
                'O POS',
                'This is a test',
                reportId
            ]);
            
            return res.json({
                status: 'success',
                message: 'Test record inserted successfully',
                reportId
            });
            
        } catch (insertError) {
            log.error('Error inserting test data:', insertError);
            return res.status(500).json({
                status: 'error',
                message: 'Error inserting test data',
                error: insertError.message
            });
        }
    } catch (error) {
        log.error('Error in test endpoint:', error);
        next(error);
    }
});

// Process an existing report
router.post('/process/:reportId', async (req, res, next) => {
    try {
        // Get the report from raw_reports
        const report = await queryGet(
            'SELECT * FROM raw_reports WHERE id = ?',
            [req.params.reportId]
        );

        if (!report) {
            return res.status(404).json({
                status: 'error',
                message: 'Report not found'
            });
        }

        // Parse the stored patients JSON
        const patients = JSON.parse(report.patients);
        
        // Process the patients
        const processedPatients = await processPatientData(patients, report.id);
        
        return res.json({
            status: 'success',
            message: 'Report processed successfully',
            data: {
                reportId: report.id,
                processedPatientsCount: processedPatients.length
            }
        });
    } catch (error) {
        log.error('Error processing existing report:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to process report',
            error: error.message
        });
    }
});

export default router; 