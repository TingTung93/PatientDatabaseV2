const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const OrphanedCautionCardRepository = require('../repositories/OrphanedCautionCardRepository');
const { AppError } = require('../errors/ErrorTypes');

class OrphanedCardController {
  constructor() {
    this.orphanedCardRepository = OrphanedCautionCardRepository;
  }

  async getOrphanedCards(req, res) {
    try {
      const cards = await this.orphanedCardRepository.findAll();
      res.json(cards);
    } catch (error) {
      logger.error('Error in getOrphanedCards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOrphanedCard(req, res) {
    try {
      const { id } = req.params;
      const card = await this.orphanedCardRepository.findById(id);

      if (!card) {
        throw new AppError('Orphaned card not found', 404);
      }

      res.json(card);
    } catch (error) {
      logger.error('Error in getOrphanedCard:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async updateOrphanedCard(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const card = await this.orphanedCardRepository.findById(id);
      if (!card) {
        throw new AppError('Orphaned card not found', 404);
      }

      const updated = await this.orphanedCardRepository.update(id, updateData);
      if (!updated) {
        throw new AppError('Failed to update orphaned card', 500);
      }

      const updatedCard = await this.orphanedCardRepository.findById(id);
      res.json(updatedCard);
    } catch (error) {
      logger.error('Error in updateOrphanedCard:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async deleteOrphanedCard(req, res) {
    try {
      const { id } = req.params;
      const card = await this.orphanedCardRepository.findById(id);

      if (!card) {
        throw new AppError('Orphaned card not found', 404);
      }

      // Delete the file first
      try {
        await fs.unlink(card.filePath);
      } catch (fileError) {
        logger.error('Error deleting file:', fileError);
      }

      // Delete the database record
      await this.orphanedCardRepository.delete(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error in deleteOrphanedCard:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async searchOrphanedCards(req, res) {
    try {
      const { bloodType, antibody } = req.query;
      let cards = [];

      if (bloodType) {
        cards = await this.orphanedCardRepository.searchByBloodType(bloodType);
      } else if (antibody) {
        cards = await this.orphanedCardRepository.searchByAntibodies(antibody);
      } else {
        cards = await this.orphanedCardRepository.findAll();
      }

      res.json(cards);
    } catch (error) {
      logger.error('Error in searchOrphanedCards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new OrphanedCardController();