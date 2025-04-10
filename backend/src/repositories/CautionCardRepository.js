/**
 * CautionCard Repository
 * This class handles all database operations related to caution cards.
 */
const BaseRepository = require('./BaseRepository');
const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');

class CautionCardRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
    this.tableName = 'caution_cards';
  }

  async findByPatientId(patientId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `;
    
    try {
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error finding caution cards by patient ID:', error);
      throw error;
    }
  }

  async findActiveCards(patientId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE patient_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `;
    
    try {
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error finding active caution cards:', error);
      throw error;
    }
  }

  async findExpiredCards(patientId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE patient_id = ? AND status = 'expired'
      ORDER BY created_at DESC
    `;
    
    try {
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error finding expired caution cards:', error);
      throw error;
    }
  }

  async markAsExpired(id) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      await this.run(query, [id]);
      return await this.findById(id);
    } catch (error) {
      logger.error('Error marking caution card as expired:', error);
      throw error;
    }
  }

  async markAsRevoked(id) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      await this.run(query, [id]);
      return await this.findById(id);
    } catch (error) {
      logger.error('Error marking caution card as revoked:', error);
      throw error;
    }
  }
}

module.exports = CautionCardRepository;