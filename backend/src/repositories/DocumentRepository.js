const { db } = require('../database/init');
const logger = require('../utils/logger');

class DocumentRepository {
  constructor() {
    this.db = db;
  }

  async findAll() {
    try {
      return this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all();
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async findByPatientId(patientId) {
    try {
      return this.db.prepare('SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
    } catch (error) {
      logger.error('Error in findByPatientId:', error);
      throw error;
    }
  }

  async create(documentData) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO documents (patient_id, document_type, file_path, file_name, file_size, mime_type, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        documentData.patientId,
        documentData.documentType,
        documentData.filePath,
        documentData.fileName,
        documentData.fileSize,
        documentData.mimeType,
        JSON.stringify(documentData.metadata || {})
      );
      return { id: result.lastInsertRowid, ...documentData };
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  async update(id, documentData) {
    try {
      const stmt = this.db.prepare(
        'UPDATE documents SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      const result = stmt.run(
        JSON.stringify(documentData.metadata || {}),
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
      const stmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async searchByMetadata(searchTerm) {
    try {
      // Note: SQLite doesn't have full-text search by default, so we're using LIKE
      return this.db.prepare(
        "SELECT * FROM documents WHERE metadata LIKE ? ORDER BY created_at DESC"
      ).all(`%${searchTerm}%`);
    } catch (error) {
      logger.error('Error in searchByMetadata:', error);
      throw error;
    }
  }
}

module.exports = new DocumentRepository();