const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');
const BaseRepository = require('./BaseRepository');

class DocumentRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
    this.tableName = 'documents';
  }

  async findAll() {
    try {
      const query = 'SELECT * FROM documents ORDER BY created_at DESC';
      return await this.query(query);
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT * FROM documents WHERE id = ?';
      return await this.queryOne(query, [id]);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async findByPatientId(patientId) {
    try {
      const query = 'SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at DESC';
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error in findByPatientId:', error);
      throw error;
    }
  }

  async create(documentData) {
    try {
      const query = 'INSERT INTO documents (patient_id, document_type, file_path, file_name, file_size, mime_type, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const params = [
        documentData.patientId,
        documentData.documentType,
        documentData.filePath,
        documentData.fileName,
        documentData.fileSize,
        documentData.mimeType,
        JSON.stringify(documentData.metadata || {})
      ];
      
      const result = await this.run(query, params);
      return { id: result.lastID, ...documentData };
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  async update(id, documentData) {
    try {
      const query = 'UPDATE documents SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const params = [
        JSON.stringify(documentData.metadata || {}),
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
      const query = 'DELETE FROM documents WHERE id = ?';
      const result = await this.run(query, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async searchByMetadata(searchTerm) {
    try {
      // Note: SQLite doesn't have full-text search by default, so we're using LIKE
      const query = "SELECT * FROM documents WHERE metadata LIKE ? ORDER BY created_at DESC";
      return await this.query(query, [`%${searchTerm}%`]);
    } catch (error) {
      logger.error('Error in searchByMetadata:', error);
      throw error;
    }
  }
}

module.exports = DocumentRepository;