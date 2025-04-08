import express from 'express';
import winston from 'winston';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises'; // Use promises for async file operations
import crypto from 'crypto';
import sanitizeFilename from 'sanitize-filename';
import Clamscan from 'clamscan'; // Use Clamscan for virus scanning
import { fileTypeFromBuffer } from 'file-type'; // For robust type checking
import createError from 'http-errors'; // For creating HTTP errors
import { fileURLToPath } from 'url';
import process from 'node:process'; // Import process

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'];
const UPLOAD_TEMP_DIR = path.join(__dirname, '..', 'data', 'uploads', 'tmp'); // Temporary storage
const UPLOAD_FINAL_DIR = path.join(__dirname, '..', 'data', 'uploads', 'caution-cards'); // Final storage

// Ensure upload directories exist
(async () => {
  try {
    await fs.mkdir(UPLOAD_TEMP_DIR, { recursive: true });
    await fs.mkdir(UPLOAD_FINAL_DIR, { recursive: true });
  } catch (err) {
    // Use logger instead of console
    logger.error('Failed to create upload directories:', { error: err });
    // Consider exiting if directories can't be created
    // process.exit(1);
  }
})();

// --- Logger (reuse server logger if possible, or configure specifically) ---
// Assuming a shared logger might be better, but keeping this for now
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
       format: winston.format.simple() // Simpler format for console
    }),
    // Add file transport if needed for route-specific logs
    // new winston.transports.File({ filename: path.join(__dirname, '..', 'logs', 'patients-route.log') })
  ],
});

// --- ClamAV Scanner Initialization ---
// Note: Requires ClamAV daemon (clamd) to be running on the server.
// Configuration might need adjustment based on the server setup.
// --- ClamAV Scanner Initialization ---
// Configuration relies on environment variables for flexibility.
// Ensure CLAMD_HOST, CLAMD_PORT, CLAMDSCAN_PATH are set in your environment.
const clamscanConfig = {
  removeInfected: false,
  quarantineInfected: false,
  scanLog: process.env.CLAMSCAN_LOG_PATH || path.join(__dirname, '..', 'logs', 'clamscan.log'), // Optional log file path from env
  debugMode: process.env.NODE_ENV !== 'production',
  fileWait: parseInt(process.env.CLAMSCAN_FILE_WAIT || '30000', 10), // Max wait time from env
  clamdscan: {
    // Path to clamdscan executable from env (provide a sensible default or error if not set)
    path: process.env.CLAMDSCAN_PATH, // Example: '/usr/bin/clamdscan' or 'C:\\Program Files\\ClamAV\\clamdscan.exe'
    host: process.env.CLAMD_HOST || '127.0.0.1', // Host from env
    port: parseInt(process.env.CLAMD_PORT || '3310', 10), // Port from env
    timeout: parseInt(process.env.CLAMDSCAN_TIMEOUT || '60000', 10), // Timeout from env
    localFallback: true, // Use local clamscan if clamdscan daemon fails
    // configFile: process.env.CLAMD_CONFIG_FILE // Optional config file path from env
  },
  preference: 'clamdscan'
};

// Validate essential ClamAV config
if (!clamscanConfig.clamdscan.path) {
    logger.warn('CLAMDSCAN_PATH environment variable is not set. ClamAV scanning might fail if clamdscan is not in the system PATH.');
    // Depending on requirements, you might want to throw an error here instead:
    // throw new Error('CLAMDSCAN_PATH environment variable is required for virus scanning.');
}

const clamscan = new Clamscan().init(clamscanConfig);

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_TEMP_DIR); // Save to temporary directory first
  },
  filename: (req, file, cb) => {
    // Use a temporary unique name to avoid collisions
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Basic MIME type check (more robust check later)
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`Upload rejected: Invalid MIME type ${file.mimetype} for file ${file.originalname}`);
    cb(createError(400, `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: fileFilter
}).single('cautionCardFile'); // Matches the field name expected from the frontend

// GET /api/v1/patients
router.get('/', async (req, res, next) => {
  try {
    // Placeholder: Implement logic to fetch patients from the database
    // Example: const patients = await PatientModel.find({}).limit(req.query.limit).skip(...);
    logger.info(`GET /api/v1/patients called with query: ${JSON.stringify(req.query)}`);
    res.status(200).json([]); // Return empty array for now
  } catch (error) {
    logger.error('Error fetching patients:', error);
    next(error); // Pass error to the global error handler
  }
});

// --- Caution Card Upload Route ---
router.post('/:patientId/caution-cards', (req, res, next) => {
  // Use Multer middleware to handle the upload
  upload(req, res, async (err) => {
    const patientId = req.params.patientId; // TODO: Validate patientId format/existence

    // --- Multer Errors ---
    if (err instanceof multer.MulterError) {
      logger.warn(`Multer error during upload for patient ${patientId}: ${err.message}`, { code: err.code });
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(createError(400, `File too large. Maximum size: ${MAX_FILE_SIZE_MB} MB.`));
      }
      return next(createError(400, `File upload error: ${err.message}`));
    } else if (err) {
      // Handle custom errors from fileFilter or other issues
      logger.error(`Unknown upload error for patient ${patientId}: ${err.message}`, { error: err });
      return next(err); // Pass the specific error (e.g., invalid type)
    }

    // --- File Existence Check ---
    if (!req.file) {
      logger.warn(`Upload attempt for patient ${patientId} with no file.`);
      return next(createError(400, 'No file uploaded. Please select a file.'));
    }

    const tempFilePath = req.file.path;
    const originalFilename = req.file.originalname;
    const sanitizedOriginalFilename = sanitizeFilename(originalFilename); // Sanitize original name for logging/metadata

    logger.info(`File received for patient ${patientId}: ${sanitizedOriginalFilename} (temp: ${tempFilePath})`);

    try {
      // --- Robust File Type Validation (using file-type) ---
      const fileBuffer = await fs.readFile(tempFilePath);
      const typeInfo = await fileTypeFromBuffer(fileBuffer);
      if (!typeInfo || !ALLOWED_MIME_TYPES.includes(typeInfo.mime)) {
          await fs.unlink(tempFilePath); // Clean up temp file
          logger.warn(`Upload rejected: File content mismatch for ${sanitizedOriginalFilename}. Detected: ${typeInfo?.mime || 'unknown'}`);
          return next(createError(400, `Invalid file content type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
      }
      logger.debug(`File content type verified for ${sanitizedOriginalFilename}: ${typeInfo.mime}`);


      // --- Malware Scan ---
      const clam = await clamscan; // Ensure scanner is initialized
      logger.debug(`Scanning file: ${tempFilePath}`);
      const { isInfected, viruses } = await clam.scanFile(tempFilePath);

      if (isInfected) {
        await fs.unlink(tempFilePath); // Delete infected file
        logger.warn(`Infected file detected and deleted: ${sanitizedOriginalFilename} (Viruses: ${viruses.join(', ')})`);
        return next(createError(400, 'Malware detected in the uploaded file. Upload rejected.'));
      }
      logger.info(`File scan clean: ${sanitizedOriginalFilename}`);


      // --- Secure Filename Generation & File Move ---
      const fileExtension = path.extname(originalFilename) || `.${typeInfo.ext}`; // Use detected extension if original is missing
      const secureFilename = `${crypto.randomUUID()}${fileExtension}`; // Generate unique, secure filename
      const finalFilePath = path.join(UPLOAD_FINAL_DIR, secureFilename);

      await fs.rename(tempFilePath, finalFilePath); // Move file to final destination
      logger.info(`File moved to final storage for patient ${patientId}: ${finalFilePath}`);


      // --- Database Interaction ---
      // Assumes a `dbService` module exists that handles database connections
      // and uses parameterized queries internally to prevent SQL injection.
      // Example: dbService might use 'pg' client's query(text, values) method.
      // eslint-disable-next-line no-unused-vars
      const cautionCardData = { // Marked as unused because the actual DB call is commented out below
          patientId: patientId, // Ensure this is validated/sanitized if needed elsewhere
          originalFilename: sanitizedOriginalFilename,
          storedFilename: secureFilename, // The unique name used for storage
          filePath: path.relative(path.join(__dirname, '..', 'data'), finalFilePath), // Store path relative to data dir? Or just filename?
          mimeType: typeInfo.mime,
          sizeBytes: req.file.size,
          uploadedBy: req.user?.id || null // Assumes auth middleware adds `req.user`
      };

      // Placeholder for actual database service call
      // Replace `dbService.addCautionCard` with your actual database insertion logic.
      // Ensure the implementation of `addCautionCard` uses parameterized queries.
      // e.g., using node-postgres (pg):
      // const query = 'INSERT INTO caution_cards(...) VALUES($1, $2, ...) RETURNING id';
      // const values = [cautionCardData.patientId, cautionCardData.originalFilename, ...];
      // const { rows } = await pool.query(query, values); // Example result retrieval
      // const dbResult = rows[0]; // Example result assignment

      // Simulating a successful DB operation for now:
      const dbResult = { id: crypto.randomUUID() }; // Replace with actual result from DB insert
      logger.info(`Caution card metadata prepared for DB insertion for patient ${patientId}. Simulated DB ID: ${dbResult.id}`);
      // await dbService.addCautionCard(cautionCardData); // TODO: Replace with actual implementation using cautionCardData


      // --- Success Response ---
      // Avoid sending back potentially sensitive info like full paths
      res.status(201).json({
        message: 'Caution card uploaded and processed successfully.',
        fileId: dbResult.id, // ID from database record (using the simulated result for now)
        filename: sanitizedOriginalFilename, // Return sanitized original name for user feedback
        // Do NOT return secureFilename or finalFilePath unless absolutely necessary for the frontend flow
      });

    } catch (error) {
      logger.error(`Error processing upload for patient ${patientId} (${originalFilename}): ${error.message}`, { stack: error.stack });
      // --- Cleanup on Error ---
      try {
        if (tempFilePath && await fs.stat(tempFilePath).catch(() => false)) {
          await fs.unlink(tempFilePath);
          logger.info(`Cleaned up temporary file on error: ${tempFilePath}`);
        }
      } catch (cleanupError) {
        logger.error(`Failed to cleanup temporary file ${tempFilePath} on error: ${cleanupError.message}`);
      }
      // Pass error to the global error handler
      next(createError(500, 'Failed to process the uploaded file.'));
    }
  });
});


// Add other patient-related routes here (POST, GET /:id, PUT /:id, DELETE /:id)

export default router;