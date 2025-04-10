/**
 * Report Repository
 * This class handles all database operations related to reports.
 */
const BaseRepository = require('./BaseRepository');
const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');

class ReportRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
    this.tableName = 'reports';
  }

  async search(filters) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.patientId) {
      query += ' AND patient_id = ?';
      params.push(filters.patientId);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.dateFrom) {
      query += ' AND created_at >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND created_at <= ?';
      params.push(filters.dateTo);
    }

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    query += ' ORDER BY created_at DESC';

    try {
      return await this.query(query, params);
    } catch (error) {
      logger.error('Error searching reports:', error);
      throw error;
    }
  }

  async getReportWithPatient(reportId) {
    const query = `
      SELECT r.*, p.first_name, p.last_name, p.date_of_birth
      FROM ${this.tableName} r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.id = ?
    `;
    
    try {
      return await this.queryOne(query, [reportId]);
    } catch (error) {
      logger.error('Error getting report with patient:', error);
      throw error;
    }
  }

  async getReportAttachments(reportId) {
    const query = `
      SELECT * FROM report_attachments
      WHERE report_id = ?
      ORDER BY created_at ASC
    `;
    
    try {
      return await this.query(query, [reportId]);
    } catch (error) {
      logger.error('Error getting report attachments:', error);
      throw error;
    }
  }

  async addAttachment(reportId, attachmentData) {
    const query = `
      INSERT INTO report_attachments (
        report_id, file_name, file_path, file_type, file_size
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      reportId,
      attachmentData.fileName,
      attachmentData.filePath,
      attachmentData.fileType,
      attachmentData.fileSize
    ];
    
    try {
      const result = await this.run(query, params);
      return await this.getAttachmentById(result.lastID);
    } catch (error) {
      logger.error('Error adding report attachment:', error);
      throw error;
    }
  }

  async getAttachmentById(attachmentId) {
    const query = `
      SELECT * FROM report_attachments
      WHERE id = ?
    `;
    
    try {
      return await this.queryOne(query, [attachmentId]);
    } catch (error) {
      logger.error('Error getting attachment by ID:', error);
      throw error;
    }
  }

  async deleteAttachment(attachmentId) {
    const query = `
      DELETE FROM report_attachments
      WHERE id = ?
    `;
    
    try {
      return await this.run(query, [attachmentId]);
    } catch (error) {
      logger.error('Error deleting attachment:', error);
      throw error;
    }
  }

  async updateStatus(reportId, status, updatedBy) {
    const query = `
      UPDATE ${this.tableName}
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      return await this.run(query, [status, updatedBy, reportId]);
    } catch (error) {
      logger.error('Error updating report status:', error);
      throw error;
    }
  }
}

module.exports = ReportRepository; 