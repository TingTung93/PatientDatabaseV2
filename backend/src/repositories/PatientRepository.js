/**
 * Patient Repository
 * This class handles all database operations related to patients.
 */
const { db } = require('../database/init');
const logger = require('../utils/logger');
const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.tableName = 'patients';
  }

  async search(filters) {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (filters.name) {
      const nameParts = filters.name.trim().split(/\s+/);
      if (nameParts.length > 1) {
        query += ' AND (first_name LIKE ? AND last_name LIKE ?)';
        params.push(`%${nameParts[0]}%`, `%${nameParts[nameParts.length - 1]}%`);
      } else {
        query += ' AND (first_name LIKE ? OR last_name LIKE ?)';
        params.push(`%${nameParts[0]}%`, `%${nameParts[0]}%`);
      }
    }

    if (filters.dateOfBirth) {
      query += ' AND date_of_birth = ?';
      params.push(filters.dateOfBirth);
    }

    if (filters.bloodType) {
      query += ' AND blood_type = ?';
      params.push(filters.bloodType);
    }

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  async getPatientReports(patientId) {
    const stmt = this.db.prepare(`
      SELECT r.* 
      FROM reports r
      WHERE r.patient_id = ?
      ORDER BY r.created_at DESC
    `);
    return stmt.all(patientId);
  }

  async getPatientCautionCards(patientId) {
    const stmt = this.db.prepare(`
      SELECT c.* 
      FROM caution_cards c
      WHERE c.patient_id = ?
      ORDER BY c.created_at DESC
    `);
    return stmt.all(patientId);
  }

  async linkReport(patientId, reportId) {
    const stmt = this.db.prepare(`
      UPDATE reports 
      SET patient_id = ?
      WHERE id = ?
    `);
    return stmt.run(patientId, reportId);
  }

  async linkCautionCard(patientId, cardId) {
    const stmt = this.db.prepare(`
      UPDATE caution_cards 
      SET patient_id = ?, status = 'linked'
      WHERE id = ?
    `);
    return stmt.run(patientId, cardId);
  }
}

module.exports = PatientRepository;