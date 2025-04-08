const ocrService = require('../src/services/ocrService');
const logger = require('../src/utils/logger');
const path = require('path');

async function verifyOCR() {
    try {
        logger.info('Starting OCR service verification...');

        // Step 1: Initialize OCR service
        logger.info('Initializing OCR service...');
        await ocrService.initialize();
        logger.info('OCR service initialized successfully');

        // Step 2: Wait for ready state
        logger.info('Waiting for OCR service to be ready...');
        let attempts = 0;
        while (!ocrService.isReady && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (!ocrService.isReady) {
            throw new Error('OCR service failed to become ready');
        }

        logger.info('OCR service is ready');

        // Step 3: Verify Python process
        if (!ocrService.pythonProcess) {
            throw new Error('Python process not running');
        }
        logger.info('Python process is running');

        // Step 4: Test processing a sample image
        const sampleImagePath = path.join(__dirname, '../test/fixtures/sample.png');
        logger.info(`Testing OCR with sample image: ${sampleImagePath}`);
        
        const result = await ocrService.processImage(sampleImagePath);
        logger.info('OCR test result:', result);

        // Step 5: Cleanup
        await ocrService.shutdown();
        logger.info('OCR service verification completed successfully');
        process.exit(0);

    } catch (error) {
        logger.error('OCR service verification failed:', error);
        process.exit(1);
    }
}

// Run verification
verifyOCR(); 