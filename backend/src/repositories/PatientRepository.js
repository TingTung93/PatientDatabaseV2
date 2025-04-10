/**
 * Patient Repository
 * This class handles all database operations related to patients.
 */
const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');
const BaseRepository = require('./BaseRepository');

class PatientRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
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

    try {
      return await this.query(query, params);
    } catch (error) {
      logger.error('Error searching patients:', error);
      throw error;
    }
  }

  async getPatientReports(patientId) {
    const query = `
      SELECT r.* 
      FROM reports r
      WHERE r.patient_id = ?
      ORDER BY r.created_at DESC
    `;
    
    try {
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error getting patient reports:', error);
      throw error;
    }
  }

  async getPatientCautionCards(patientId) {
    const query = `
      SELECT c.* 
      FROM caution_cards c
      WHERE c.patient_id = ?
      ORDER BY c.created_at DESC
    `;
    
    try {
      return await this.query(query, [patientId]);
    } catch (error) {
      logger.error('Error getting patient caution cards:', error);
      throw error;
    }
  }

  async linkReport(patientId, reportId) {
    const query = `
      UPDATE reports 
      SET patient_id = ?
      WHERE id = ?
    `;
    
    try {
      return await this.run(query, [patientId, reportId]);
    } catch (error) {
      logger.error('Error linking report to patient:', error);
      throw error;
    }
  }

  async linkCautionCard(patientId, cardId) {
    const query = `
      UPDATE caution_cards 
      SET patient_id = ?, status = 'linked'
      WHERE id = ?
    `;
    
    try {
      return await this.run(query, [patientId, cardId]);
    } catch (error) {
      logger.error('Error linking caution card to patient:', error);
      throw error;
    }
  }
}

module.exports = PatientRepository;