const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { upload } = require('./config/upload.config');
const FileProcessingService = require('./services/FileProcessingService');
const { register } = require('./monitoring/metrics');
const MonitoringService = require('./monitoring/MonitoringService');
const { getInstance: getWebSocketService } = require('./services/WebSocketService');
const errorHandler = require('./utils/ErrorHandler');
const uploadRoutes = require('./routes/uploadRoutes');
const cautionCardsRouter = require('./routes/caution-cards');
const patientsRouter = require('./routes/patients');
const reportsRouter = require('./routes/reports');
const { initializeDatabase } = require('./database/init');
const { notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { requestLogger, errorLogger, performanceMonitor } = require('./middleware/requestLogger');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const logger = require('./utils/logger');
const ocrService = require('./services/ocrService');
const { OcrError } = require('./utils/errors');

// Create Express app
const app = express();

// Middleware setup
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OCR Routes
app.get('/api/ocr/health', async (req, res) => {
    try {
        if (!ocrService.isReady) {
            throw new Error('OCR service not initialized');
        }
        res.json({ 
            status: 'ok',
            isReady: ocrService.isReady,
            pythonProcess: ocrService.pythonProcess ? 'running' : 'not running'
        });
    } catch (error) {
        logger.error('OCR health check failed:', error);
        res.status(503).json({ 
            status: 'error',
            message: error.message
        });
    }
});

app.post('/api/ocr/process', async (req, res) => {
    try {
        if (!ocrService.isReady) {
            throw new OcrError('OCR service not initialized');
        }

        const { imagePath } = req.body;
        if (!imagePath) {
            throw new OcrError('No image path provided');
        }

        const result = await ocrService.processImage(imagePath);
        res.json(result);
    } catch (error) {
        logger.error('OCR processing error:', error);
        res.status(error instanceof OcrError ? 400 : 500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

// Export the app
module.exports = app;