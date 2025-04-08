// backend/services/ocrProcessor.js
import path from 'path';
import fsPromises from 'fs/promises';
import crypto from 'crypto';
import { spawn } from 'child_process';
import winston from 'winston';
import { fileURLToPath } from 'url';
import process from 'node:process';
import db from '../database/db.js'; // Assuming db setup is correct

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger (consider sharing logger instance across modules)
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: process.env.LOG_FILENAME || 'logs/app.log', level: 'error' }),
        new winston.transports.File({ filename: process.env.LOG_FILENAME || 'logs/app.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

const getMappedFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('application/pdf')) return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    // Default or throw error? Let's throw for clarity.
    throw new Error(`Unsupported file type for mapping: ${mimeType}`);
};


/**
 * Processes a single caution card image using OCR and saves results.
 * @param {string} filePath - Absolute path to the image file.
 * @param {string} originalFilename - Original name of the uploaded file.
 * @param {string} mimeType - Mime type of the file.
 * @param {number} userId - The ID of the user initiating the process. // TODO: Get from auth context
 * @returns {Promise<object>} - Resolves with processing results (reviewItemId, attachmentId, isOrphaned, etc.)
 * @throws {Error} - Throws error if processing fails at any stage.
 */
export async function processSingleCautionCard(filePath, originalFilename, mimeType, userId = 1) {
    logger.info(`Starting OCR processing for file: ${filePath}`);

    let ocrResults;
    let fileData;
    let fileHash;
    let patientInternalId;
    let isOrphaned = false;
    let reviewItemId;
    let attachmentId;

    try {
        // --- Step 1: Execute Python OCR Script ---
        const pythonScript = path.join(__dirname, '../form_ocr/process_card.py');
        const alignmentMask = path.join(__dirname, '../form_ocr/resources/masks/alignment_mask.png');
        const manualMask = path.join(__dirname, '../form_ocr/resources/masks/manualmask.png');
        const coordsFile = path.join(__dirname, '../form_ocr/resources/coordinates/caution_card_coords.json');

        ocrResults = await new Promise((resolve, reject) => {
            const python = spawn('python', [
                pythonScript,
                filePath,
                alignmentMask,
                manualMask,
                coordsFile
            ]);

            let ocrOutput = '';
            let ocrError = '';

            python.stdout.on('data', (data) => {
                ocrOutput += data.toString();
                logger.debug(`Python stdout for ${path.basename(filePath)}: ${data.toString()}`);
            });

            python.stderr.on('data', (data) => {
                ocrError += data.toString();
                logger.error(`Python stderr for ${path.basename(filePath)}: ${data.toString()}`);
            });

            python.on('error', (error) => {
                logger.error(`Failed to start Python process for ${filePath}:`, error);
                reject(new Error(`Failed to start OCR process: ${error.message}`));
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    logger.error(`OCR process for ${filePath} exited with code ${code}`);
                    reject(new Error(`OCR script failed (code ${code}): ${ocrError || 'No stderr output'}`));
                } else {
                    try {
                        const parsedOutput = JSON.parse(ocrOutput);
                        resolve(parsedOutput);
                    } catch (parseError) {
                        logger.error(`Failed to parse OCR output for ${filePath}: ${parseError}`);
                        reject(new Error(`Failed to parse OCR output: ${parseError.message}\nOutput: ${ocrOutput}`));
                    }
                }
            });
        });

        logger.info(`OCR script finished successfully for ${filePath}.`);

        // --- Step 2: Extract MRN and Find Patient ---
        const extractedMrn = ocrResults?.data?.patient_info?.mrn;
        if (!extractedMrn) {
            throw new Error("MRN could not be extracted from OCR results.");
        }
        const cleanedMrn = extractedMrn.replace(/\D/g, '').trim();
         if (!cleanedMrn) {
            throw new Error(`Extracted MRN ('${extractedMrn}') is invalid after cleaning.`);
        }
        logger.info(`Extracted and cleaned MRN for ${filePath}: ${cleanedMrn}`);

        patientInternalId = await db.getPatientInternalId(cleanedMrn);
        if (!patientInternalId) {
            logger.warn(`Patient with MRN ${cleanedMrn} not found for file ${filePath}. Proceeding as orphaned item.`);
            patientInternalId = null; // Explicitly set to null
            isOrphaned = true;
        } else {
             logger.info(`Found patient internal ID ${patientInternalId} for MRN ${cleanedMrn}.`);
        }

        // --- Step 3: Read File and Calculate Hash ---
        fileData = await fsPromises.readFile(filePath);
        fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

        // --- Step 4: Database Operations ---
        // Insert review item
        reviewItemId = await db.insertReviewItem(
            patientInternalId,
            'caution_card',
            ocrResults.data,
            userId
        );
        logger.info(`Inserted review item ${reviewItemId} for file ${filePath}.`);

        // Insert file attachment
        const mappedFileType = getMappedFileType(mimeType);
        attachmentId = await db.insertFileAttachment(
            patientInternalId,
            null, // review_queue_id initially null
            mappedFileType,
            originalFilename, // Use original filename here
            fileHash,
            fileData,
            userId
        );
        logger.info(`Inserted file attachment ${attachmentId} for file ${filePath}.`);

        // Link attachment to review item
        await db.linkAttachmentToReview(attachmentId, reviewItemId);
        logger.info(`Linked attachment ${attachmentId} to review item ${reviewItemId}.`);

        // --- Step 5: Return Results ---
        return {
            success: true,
            reviewItemId,
            attachmentId,
            isOrphaned,
            patientInternalId,
            extractedMrn: cleanedMrn,
            originalFilename,
            ocrData: ocrResults.data // Return the processed data
        };

    } catch (error) {
        logger.error(`Error during OCR processing for ${filePath}: ${error.message}`, { stack: error.stack });
        // Ensure cleanup happens even if DB operations fail before it
        throw error; // Re-throw the error to be handled by the caller (e.g., worker)
    } finally {
        // --- Step 6: Clean up temporary file ---
        try {
            await fsPromises.unlink(filePath);
            logger.info(`Deleted temporary file: ${filePath}`);
        } catch (unlinkErr) {
            // Log error but don't let cleanup failure mask the original error
            logger.error(`Error deleting temporary upload file ${filePath}:`, unlinkErr);
        }
    }
}