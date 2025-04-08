/**
 * Report Repository
 * This class handles all database operations related to reports.
 */
const BaseRepository = require('./BaseRepository');

class ReportRepository extends BaseRepository {
  constructor(db) {
    super(db);
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

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  async getReportWithPatient(reportId) {
    const stmt = this.db.prepare(`
      SELECT r.*, p.first_name, p.last_name, p.date_of_birth
      FROM ${this.tableName} r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.id = ?
    `);
    return stmt.get(reportId);
  }

  async getReportAttachments(reportId) {
    const stmt = this.db.prepare(`
      SELECT * FROM report_attachments
      WHERE report_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(reportId);
  }

  async addAttachment(reportId, attachmentData) {
    const stmt = this.db.prepare(`
      INSERT INTO report_attachments (
        report_id, file_name, file_path, file_type, file_size
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      reportId,
      attachmentData.fileName,
      attachmentData.filePath,
      attachmentData.fileType,
      attachmentData.fileSize
    );
    
    return this.getAttachmentById(result.lastInsertRowid);
  }

  async getAttachmentById(attachmentId) {
    const stmt = this.db.prepare(`
      SELECT * FROM report_attachments
      WHERE id = ?
    `);
    return stmt.get(attachmentId);
  }

  async deleteAttachment(attachmentId) {
    const stmt = this.db.prepare(`
      DELETE FROM report_attachments
      WHERE id = ?
    `);
    return stmt.run(attachmentId);
  }

  async updateStatus(reportId, status, updatedBy) {
    const stmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(status, updatedBy, reportId);
  }
}

module.exports = ReportRepository; 