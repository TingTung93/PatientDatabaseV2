// backend/workers/ocrBatchWorker.js
/* eslint-env node, commonjs */ // Specify Node.js environment for ESLint

const db = require('../db/index'); // Use the provided path
const { processSingleCautionCard } = require('../services/ocrProcessor'); // Use the provided path

const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds
// eslint-disable-next-line no-unused-vars
const MAX_RETRIES = 3; // Example: Maximum retries for a failed job (will be used with retry logic)

/**
 * Fetches a single queued OCR batch job from the database.
 * Uses SELECT FOR UPDATE SKIP LOCKED to handle concurrency if supported by the DB.
 * Adjust the query based on your specific database and locking strategy.
 */
async function fetchQueuedJob() {
    console.log('Checking for queued OCR jobs...');
    // Use SELECT FOR UPDATE SKIP LOCKED for PostgreSQL concurrency control
    const query = `
        SELECT id, file_path, original_filename, mime_type, user_id
        FROM ocr_batch_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
    `;
    try {
        const result = await db.query(query);
        if (result.rows.length > 0) {
            console.log(`Found job ${result.rows[0].id}`);
            return result.rows[0];
        }
        return null; // No job found
    } catch (err) {
        console.error('Error fetching queued job:', err);
        // Rethrow or handle appropriately - might indicate DB connection issues
        throw err;
    }
}

/**
 * Updates the status of a job in the database.
 */
async function updateJobStatus(jobId, status, details = {}) {
    console.log(`Updating job ${jobId} status to ${status}`);
    const updateFields = ['status = $1'];
    const values = [status, jobId];
    let paramIndex = 3; // Start parameter index after status and id

    if (status === 'completed' && details.reviewItemId && details.attachmentId) {
        updateFields.push(`review_item_id = $${paramIndex++}`);
        values.push(details.reviewItemId);
        updateFields.push(`attachment_id = $${paramIndex++}`);
        values.push(details.attachmentId);
        updateFields.push(`error_details = NULL`); // Clear errors on success
    } else if (status === 'failed') {
        updateFields.push(`error_details = $${paramIndex++}`);
        // Ensure error is stringified, handle potential circular refs if necessary
        values.push(JSON.stringify(details.error || 'Unknown error'));
        // Optional: Increment retry count or handle retries here
    }

    const query = `
        UPDATE ocr_batch_jobs
        SET ${updateFields.join(', ')}
        WHERE id = $2;
    `;

    try {
        await db.query(query, values);
        console.log(`Job ${jobId} status updated successfully.`);
    } catch (err) {
        console.error(`Error updating status for job ${jobId}:`, err);
        // Decide how to handle this - retry? Log and continue?
        // For now, log and let the worker loop potentially retry later if applicable
    }
}

/**
 * Processes a single OCR job.
 */
async function processJob(job) {
    try {
        console.log(`Processing job ${job.id} for user ${job.user_id}...`);
        // Update status immediately to prevent other workers grabbing it
        // (though SELECT FOR UPDATE should handle the primary locking)
        await updateJobStatus(job.id, 'processing');

        // Call the actual OCR processing function
        const result = await processSingleCautionCard(
            job.file_path,
            job.original_filename,
            job.mime_type,
            job.user_id
        );

        console.log(`Job ${job.id} processed successfully. Result:`, result);

        await updateJobStatus(job.id, 'completed', {
            reviewItemId: result.reviewItemId, // Assuming the function returns these keys
            attachmentId: result.attachmentId,
        });

    } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        await updateJobStatus(job.id, 'failed', { error: error.message || 'Unknown error' });
        // TODO: Implement retry logic if needed
    }
}

/**
 * Main worker loop that polls for jobs.
 */
async function workerLoop() {
    try {
        const job = await fetchQueuedJob();
        if (job) {
            await processJob(job);
            // Process next job immediately if one was found
            setImmediate(workerLoop);
        } else {
            // No job found, wait before polling again
            setTimeout(workerLoop, POLLING_INTERVAL_MS);
        }
    } catch (error) {
        console.error('Error in worker loop:', error);
        // Wait before trying again to avoid tight loop on persistent errors
        setTimeout(workerLoop, POLLING_INTERVAL_MS * 2);
    }
}

/**
 * Starts the worker.
 */
function startWorker() {
    console.log('Starting OCR Batch Worker...');
    workerLoop();
}

// --- Execution ---
// --- Execution ---
// This allows running the worker as a standalone script: node backend/workers/ocrBatchWorker.js
if (require.main === module) {
    // Assuming db module handles connection pooling and doesn't need explicit connect/disconnect here
    // If explicit connection is needed, uncomment and adapt:
    // db.connect() // Or equivalent connection method
    //   .then(() => {
    //     console.log('Database connected successfully.');
           startWorker();
    //   })
    //   .catch(err => {
    //     console.error('Failed to connect to database:', err);
    //     process.exit(1); // Exit if DB connection fails on startup
    //   });

    // If db module manages pool automatically, just start:
    startWorker();

    // Graceful shutdown handling (optional but recommended)
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing OCR worker.');
        // Add cleanup logic here if needed (e.g., close DB connections if not pooled)
        process.exit(0);
    });
    process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing OCR worker.');
        // Add cleanup logic here
        process.exit(0);
    });
}

module.exports = {
    startWorker,
    // Potentially export other functions if needed for integration
};