const { db } = require('../database/init');
const logger = require('../utils/logger');

class OrphanedCautionCardRepository {
  constructor() {
    this.db = db;
  }

  async findAll() {
    try {
      return this.db.prepare('SELECT * FROM orphaned_caution_cards ORDER BY created_at DESC').all();
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return this.db.prepare('SELECT * FROM orphaned_caution_cards WHERE id = ?').get(id);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async create(cardData) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO orphaned_caution_cards (file_path, file_name, file_size, mime_type, blood_type, antibodies, transfusion_requirements, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        cardData.filePath,
        cardData.fileName,
        cardData.fileSize,
        cardData.mimeType,
        cardData.bloodType,
        JSON.stringify(cardData.antibodies || []),
        JSON.stringify(cardData.transfusionRequirements || []),
        JSON.stringify(cardData.metadata || {})
      );
      return { id: result.lastInsertRowid, ...cardData };
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  async update(id, cardData) {
    try {
      const stmt = this.db.prepare(
        'UPDATE orphaned_caution_cards SET blood_type = ?, antibodies = ?, transfusion_requirements = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      const result = stmt.run(
        cardData.bloodType,
        JSON.stringify(cardData.antibodies || []),
        JSON.stringify(cardData.transfusionRequirements || []),
        JSON.stringify(cardData.metadata || {}),
        id
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM orphaned_caution_cards WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async searchByBloodType(bloodType) {
    try {
      return this.db.prepare(
        'SELECT * FROM orphaned_caution_cards WHERE blood_type = ? ORDER BY created_at DESC'
      ).all(bloodType);
    } catch (error) {
      logger.error('Error in searchByBloodType:', error);
      throw error;
    }
  }

  async searchByAntibodies(antibody) {
    try {
      // Note: This is a simple LIKE search since we're storing antibodies as JSON
      return this.db.prepare(
        "SELECT * FROM orphaned_caution_cards WHERE antibodies LIKE ? ORDER BY created_at DESC"
      ).all(`%${antibody}%`);
    } catch (error) {
      logger.error('Error in searchByAntibodies:', error);
      throw error;
    }
  }
}

module.exports = new OrphanedCautionCardRepository();