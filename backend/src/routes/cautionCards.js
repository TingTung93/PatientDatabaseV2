import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
// import validator from 'validator'; // Seems unused, commented out

import CautionCardController from '../controllers/CautionCardController.js'; // Added .js
import { ApiError } from '../middleware/errorHandler.js'; // Added .js
import validateRequest from '../middleware/validateRequest.js'; // Added .js
import logger from '../utils/logger.js'; // Added .js

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/caution-cards');
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Validation rules
const validateUuid = param('id').isUUID().withMessage('Invalid card ID format (must be UUID)');

const validateFinalize = [
  param('id').isUUID().withMessage('Invalid card ID format'),
  body('reviewedData').isObject().withMessage('Reviewed data must be an object'),
  body('reviewedData.patientName').notEmpty().withMessage('Patient name is required'),
  body('isOrphaned').isBoolean().withMessage('isOrphaned must be a boolean'),
  body('linkedPatientId')
    .optional()
    .isUUID()
    .withMessage('Invalid patient ID format')
    .custom((value, { req }) => {
      if (req.body.isOrphaned && value) {
        throw new Error('linkedPatientId should not be provided when isOrphaned is true');
      }
      if (!req.body.isOrphaned && !value) {
        throw new Error('linkedPatientId is required when isOrphaned is false');
      }
      return true;
    }),
  validateRequest // Assuming validateRequest is designed to work with express-validator result
];

const validateList = [
  query('status').optional().isIn(['processing_ocr', 'pending_review', 'linked', 'orphaned'])
    .withMessage('Invalid status value'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
];

// Create router
const router = express.Router();
const cautionCardController = new CautionCardController(); // Instantiate controller directly

// POST /api/v1/caution-cards/process - Upload card, trigger OCR, initial save (Async)
router.post('/process', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    try {
      logger.info('Received request to process caution card');
      
      // Handle multer errors
      if (err) {
        if (err instanceof ApiError) {
          throw err;
        }
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            throw ApiError.badRequest('File size exceeds 10MB limit');
          }
          throw ApiError.badRequest(err.message);
        }
        throw ApiError.badRequest('Error uploading file');
      }

      // Validate file presence
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded or invalid file type');
      }

      // Process the card
      const result = await cautionCardController.processCard(req.file);

      // Return accepted status since OCR processing is async
      res.status(202).json({
        status: 'success',
        data: result,
        message: 'Card upload accepted, OCR processing started'
      });
    } catch (error) {
      // Clean up uploaded file if processing fails
      if (req.file) {
        // Use import() for fs within async function as require is not available
        const fs = await import('fs/promises'); 
        fs.unlink(req.file.path).catch(err => {
          logger.error('Failed to clean up uploaded file:', err);
        });
      }
      next(error);
    }
  });
});

// PUT /api/v1/caution-cards/:id/finalize - Save reviewed data, link or mark as orphan
router.put('/:id/finalize', validateFinalize, async (req, res, next) => {
  try {
    // Check validation results (needed when not using a dedicated middleware factory)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reviewedData, linkedPatientId, isOrphaned } = req.body;

    logger.info(`Finalizing caution card ${id}`, {
      isOrphaned,
      hasLinkedPatient: !!linkedPatientId
    });

    const result = await cautionCardController.finalizeCard(
      id,
      reviewedData,
      isOrphaned,
      linkedPatientId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/caution-cards/:id - Get card details
router.get('/:id', validateUuid, validateRequest, async (req, res, next) => {
  try {
     // Check validation results (needed when not using a dedicated middleware factory)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    logger.debug(`>>> ENTERING GET /caution-cards/${req.params.id} handler`);
    const { id } = req.params;
    logger.info(`Received request to get caution card ${id}`);

    const result = await cautionCardController.getCard(id);
    if (!result) {
      throw ApiError.notFound('Caution card not found');
    }

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/caution-cards/:id/suggestions - Get patient link suggestions
router.get('/:id/suggestions', validateUuid, validateRequest, async (req, res, next) => {
  try {
     // Check validation results (needed when not using a dedicated middleware factory)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    logger.debug(`>>> ENTERING GET /caution-cards/${req.params.id}/suggestions handler`);
    const { id } = req.params;
    logger.info(`Received request for suggestions for caution card ${id}`);

    const result = await cautionCardController.getSuggestions(id);
    if (!result) {
      throw ApiError.notFound('Caution card not found');
    }

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/caution-cards - List/Search caution cards
router.get('/', validateList, validateRequest, async (req, res, next) => {
  try {
     // Check validation results (needed when not using a dedicated middleware factory)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { status, search, limit, offset } = req.query;
    logger.info('Received request to list caution cards');

    const result = await cautionCardController.listCards({
      status,
      search,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0
    });

    if (!result) {
      throw ApiError.serverError('Failed to list cards');
    }

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;