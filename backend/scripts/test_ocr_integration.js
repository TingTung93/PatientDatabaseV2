const path = require('path');
const fs = require('fs').promises;

const OcrService = require('../src/services/OcrService');
const logger = require('../src/utils/logger');

async function testOcrIntegration() {
    const ocrService = new OcrService();
    const testImagePath = path.join(__dirname, '../test_data/sample_caution_card.png');

    try {
        // Verify test image exists
        await fs.access(testImagePath);
        logger.info('Test image found:', testImagePath);

        // Process the image
        logger.info('Starting OCR processing...');
        const startTime = Date.now();
        const result = await ocrService.processImage({ path: testImagePath });
        const processingTime = Date.now() - startTime;

        // Log results
        logger.info('OCR Processing completed in', processingTime, 'ms');
        logger.info('Results:', JSON.stringify(result, null, 2));

        // Verify result structure
        if (!result.extractedData) {
            throw new Error('Missing extractedData in result');
        }

        // Verify required fields
        const requiredFields = ['name', 'medicalRecordNumber'];
        for (const field of requiredFields) {
            if (!result.extractedData[field]) {
                logger.warn(`Missing required field: ${field}`);
            }
        }

        // Verify phenotype data
        if (!result.extractedData.phenotypes) {
            logger.warn('Missing phenotype data');
        }

        logger.info('Integration test completed successfully');
        return true;
    } catch (error) {
        logger.error('Integration test failed:', error);
        return false;
    }
}

// Run the test
testOcrIntegration().then(success => {
    process.exit(success ? 0 : 1);
}); 