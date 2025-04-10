'use strict';

const CautionCardService = require('../services/CautionCardService');
const CautionCardRepository = require('../repositories/CautionCardRepository');
const { dbInstance } = require('../database/init');
const { ValidationError } = require('../errors/ValidationError');
const { StatusCodes } = require('http-status-codes');
const { NotFoundError } = require('../errors');

class CautionCardController {
  constructor() {
    this.repository = new CautionCardRepository(dbInstance);
    this.service = new CautionCardService(this.repository);
  }

  /**
   * Get all caution cards with optional filtering
   */
  async getAll(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        patientId, 
        dateFrom, 
        dateTo,
        reviewed,
        unreviewed
      } = req.query;

      const filters = {};
      
      if (status) filters.status = status;
      if (patientId) filters.patientId = patientId;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (reviewed === 'true') filters.reviewed = true;
      if (unreviewed === 'true') filters.unreviewed = true;

      const result = await this.service.findAll({
        ...filters,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      console.error('Error in CautionCardController.getAll:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Get a single caution card by ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const cautionCard = await this.service.findById(id);
      
      if (cautionCard.metadata && typeof cautionCard.metadata === 'string') {
        try {
          cautionCard.metadata = JSON.parse(cautionCard.metadata);
        } catch (err) {
          console.warn('Could not parse metadata JSON:', err);
        }
      }
      
      return res.status(StatusCodes.OK).json(cautionCard);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      }
      console.error('Error in CautionCardController.getById:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Process a new caution card upload
   */
  async processCard(req, res, next) {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No file uploaded' });
      }

      const fileData = {
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        file_type: req.file.mimetype
      };

      // Parse optional JSON fields from the request
      let antibodies = req.body.antibodies;
      let transfusionRequirements = req.body.transfusionRequirements;
      
      if (antibodies && typeof antibodies === 'string') {
        try {
          antibodies = JSON.parse(antibodies);
        } catch (err) {
          return res.status(StatusCodes.BAD_REQUEST).json({ 
            message: 'Invalid antibodies JSON format' 
          });
        }
      }
      
      if (transfusionRequirements && typeof transfusionRequirements === 'string') {
        try {
          transfusionRequirements = JSON.parse(transfusionRequirements);
        } catch (err) {
          return res.status(StatusCodes.BAD_REQUEST).json({ 
            message: 'Invalid transfusionRequirements JSON format' 
          });
        }
      }

      const cautionCardData = {
        ...fileData,
        blood_type: req.body.bloodType,
        antibodies: antibodies,
        transfusion_requirements: transfusionRequirements,
        status: 'pending'
      };

      const createdCard = await this.service.processCautionCard(cautionCardData);
      return res.status(StatusCodes.CREATED).json(createdCard);
    } catch (error) {
      console.error('Error in CautionCardController.processCard:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Update a caution card
   */
  async updateCard(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedCard = await this.service.update(id, updateData);
      return res.status(StatusCodes.OK).json(updatedCard);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      }
      console.error('Error in CautionCardController.update:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Mark a caution card as reviewed
   */
  async markAsReviewed(req, res, next) {
    try {
      const { id } = req.params;
      const { reviewedBy } = req.body;
      
      if (!reviewedBy) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'reviewedBy is required' });
      }
      
      const updatedCard = await this.service.markAsReviewed(id, reviewedBy);
      return res.status(StatusCodes.OK).json(updatedCard);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      }
      console.error('Error in CautionCardController.markAsReviewed:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Link a caution card to a patient
   */
  async linkToPatient(req, res, next) {
    try {
      const { id } = req.params;
      const { patientId, updatedBy } = req.body;
      
      if (!patientId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'patientId is required' });
      }
      
      if (!updatedBy) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'updatedBy is required' });
      }
      
      const updatedCard = await this.service.linkToPatient(id, patientId, updatedBy);
      return res.status(StatusCodes.OK).json(updatedCard);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      }
      console.error('Error in CautionCardController.linkToPatient:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Get orphaned caution cards
   */
  async getOrphanedCards(req, res, next) {
    try {
      const cards = await this.service.getOrphanedCards();
      return res.status(StatusCodes.OK).json(cards);
    } catch (error) {
      console.error('Error in CautionCardController.getOrphanedCards:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Search caution cards by text
   */
  async searchByText(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Search query is required' });
      }
      
      const results = await this.service.search(q);
      return res.status(StatusCodes.OK).json(results);
    } catch (error) {
      console.error('Error in CautionCardController.searchByText:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * Delete a caution card (soft delete)
   */
  async deleteCard(req, res, next) {
    try {
      const { id } = req.params;
      const { updatedBy } = req.body;
      
      if (!updatedBy) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'updatedBy is required' });
      }
      
      await this.service.delete(id, updatedBy);
      return res.status(StatusCodes.OK).json({ message: 'Caution card deleted successfully' });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      }
      console.error('Error in CautionCardController.delete:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
}

module.exports = new CautionCardController();