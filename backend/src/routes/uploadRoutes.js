const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { upload } = require('../config/upload.config');
const FileValidationMiddleware = require('../middleware/fileValidation');
const rateLimitMiddleware = require('../middleware/rateLimit');
const errorHandler = require('../utils/ErrorHandler');

// Initialize multer with temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    FileValidationMiddleware.ensureTempDirectory();
    cb(null, upload.tempDir);
  },
  filename: (req, file, cb) => {
    const tempPath = FileValidationMiddleware.generateTempFilePath(file.originalname);
    cb(null, path.basename(tempPath));
  }
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: upload.maxFileSize
  }
});

const handleUpload = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const file = req.file;
    const results = [];
    const errors = [];
    const monitoring = req.app.locals.monitoring;

    if (!file) {
      throw new Error('No file uploaded');
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const processingStart = Date.now();
      const result = await req.services.fileProcessing.processFile(fileId, file.path);
      const processingDuration = (Date.now() - processingStart) / 1000;
      
      monitoring.trackOCRProcess(result.confidence || 0, processingDuration, path.extname(file.originalname));
      results.push({
        fileId,
        originalName: file.originalname,
        ...result
      });

    } catch (error) {
      monitoring.trackUpload(0, false);
      errors.push({
        fileId,
        originalName: file.originalname,
        error: error.message
      });

      errorHandler.logError(error, {
        fileId,
        originalName: file.originalname,
        context: 'file_processing'
      });
    }
    
    // Track overall upload duration and success
    const duration = (Date.now() - startTime) / 1000;
    monitoring.trackUpload(duration, errors.length === 0);

    // Return combined results
    res.json({
      status: errors.length === 0 ? 'success' : 'error',
      processed: results,
      failed: errors,
      timestamp: Date.now()
    });

  } catch (error) {
    next(error);
  }
};

const getProcessingStatus = (req, res) => {
  const { fileId } = req.params;
  const status = req.services.fileProcessing.getProcessingStatus(fileId);
  
  res.json({
    fileId,
    ...status,
    timestamp: Date.now()
  });
};

const errorMiddleware = (error, req, res, next) => {
  const errorInfo = errorHandler.logError(error, {
    route: req.path,
    method: req.method,
    context: 'upload_routes'
  });
  
  if (req.app.locals.monitoring) {
    req.app.locals.monitoring.trackUpload(0, false);
  }

  res.status(error.status || 500).json(
    errorHandler.createErrorResponse(error, req.app.get('env') === 'development')
  );
};

module.exports = (fileProcessingService, webSocketService) => {
  // Middleware to attach services to request
  router.use((req, res, next) => {
    req.services = {
      fileProcessing: fileProcessingService,
      websocket: webSocketService
    };
    next();
  });

  // File upload endpoint with rate limiting and validation
  router.post('/upload',
    rateLimitMiddleware.handle(),
    (req, res, next) => { console.log('>>> Before Multer:', req.file, req.body); next(); },
    uploadMiddleware.single('file'),
    (req, res, next) => { console.log('>>> After Multer:', req.file, req.body); next(); },
    FileValidationMiddleware.validate(),
    FileValidationMiddleware.cleanup(),
    handleUpload
  );

  // Get processing status endpoint
  router.get('/status/:fileId', 
    rateLimitMiddleware.handle(),
    getProcessingStatus
  );

  // Error handling middleware
  router.use(errorMiddleware);

  return router;
};