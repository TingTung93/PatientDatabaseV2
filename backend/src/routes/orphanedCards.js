const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const validator = require('validator');

const CautionCardController = require('../controllers/CautionCardController');
const { ApiError } = require('../middleware/errorHandler');
const validateRequest = require('../middleware/validateRequest');
const logger = require('../utils/logger');

// Validation rules
const validateUuid = param('id').isUUID().withMessage('Invalid card ID format (must be UUID)');

const validateList = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim().notEmpty().withMessage('Search term must be a non-empty string')
];

const validateLink = [
  validateUuid,
  body('patientId').isUUID().withMessage('Invalid patient ID format (must be UUID)')
];

// Create router factory function
const createOrphanedCardsRouter = (controller) => {
  const router = express.Router();
  const cautionCardController = controller || new CautionCardController();

  // GET /api/v1/orphaned-cards - List orphaned cards with pagination and search
  router.get('/', validateList, validateRequest, async (req, res, next) => {
    try {
      logger.debug('>>> ENTERING GET /orphaned-cards handler');
      const { page, limit, search } = req.query;
      logger.info('Received request to list orphaned cards');

      const result = await cautionCardController.listOrphanedCards({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search
      });

      if (!result) {
        throw ApiError.serverError('Failed to list orphaned cards');
      }

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/v1/orphaned-cards/:id/link - Link orphaned card to patient
  router.put('/:id/link', validateLink, validateRequest, async (req, res, next) => {
    try {
      logger.debug(`>>> ENTERING PUT /orphaned-cards/${req.params.id}/link handler`);
      const { id } = req.params;
      const { patientId } = req.body;
      logger.info(`Received request to link orphaned card ${id} to patient ${patientId}`);

      const result = await cautionCardController.linkOrphanedCard(id, patientId);
      if (!result) {
        throw ApiError.notFound('Orphaned card not found');
      }

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = createOrphanedCardsRouter;