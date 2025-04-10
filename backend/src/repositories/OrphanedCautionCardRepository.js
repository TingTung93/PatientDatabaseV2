const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');
const BaseRepository = require('./BaseRepository');

class OrphanedCautionCardRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
    this.tableName = 'orphaned_caution_cards';
  }

  async findAll() {
    try {
      const query = 'SELECT * FROM orphaned_caution_cards ORDER BY created_at DESC';
      return await this.query(query);
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM orphaned_caution_cards WHERE id = ?';
      return await this.queryOne(query, [id]);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async create(cardData) {
    try {
      const query = 'INSERT INTO orphaned_caution_cards (file_path, file_name, file_size, mime_type, blood_type, antibodies, transfusion_requirements, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const params = [
        cardData.filePath,
        cardData.fileName,
        cardData.fileSize,
        cardData.mimeType,
        cardData.bloodType,
        JSON.stringify(cardData.antibodies || []),
        JSON.stringify(cardData.transfusionRequirements || []),
        JSON.stringify(cardData.metadata || {})
      ];
      
      const result = await this.run(query, params);
      return { id: result.lastID, ...cardData };
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  async update(id, cardData) {
    try {
      const query = 'UPDATE orphaned_caution_cards SET blood_type = ?, antibodies = ?, transfusion_requirements = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const params = [
        cardData.bloodType,
        JSON.stringify(cardData.antibodies || []),
        JSON.stringify(cardData.transfusionRequirements || []),
        JSON.stringify(cardData.metadata || {}),
        id
      ];
      
      const result = await this.run(query, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM orphaned_caution_cards WHERE id = ?';
      const result = await this.run(query, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async searchByBloodType(bloodType) {
    try {
      const query = 'SELECT * FROM orphaned_caution_cards WHERE blood_type = ? ORDER BY created_at DESC';
      return await this.query(query, [bloodType]);
    } catch (error) {
      logger.error('Error in searchByBloodType:', error);
      throw error;
    }
  }

  async searchByAntibodies(antibody) {
    try {
      // Note: This is a simple LIKE search since we're storing antibodies as JSON
      const query = "SELECT * FROM orphaned_caution_cards WHERE antibodies LIKE ? ORDER BY created_at DESC";
      return await this.query(query, [`%${antibody}%`]);
    } catch (error) {
      logger.error('Error in searchByAntibodies:', error);
      throw error;
    }
  }
}

module.exports = OrphanedCautionCardRepository;