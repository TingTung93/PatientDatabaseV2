/**
 * Patient Controller
 * Handles HTTP requests and responses for patient operations.
 */
const PatientService = require('../services/PatientService');
const PatientRepository = require('../repositories/PatientRepository');
const { db } = require('../database/init');
const { ValidationError } = require('../errors/ValidationError');

class PatientController {
  constructor() {
    this.repository = new PatientRepository(db);
    this.service = new PatientService(this.repository);
  }

  /**
   * Search patients with pagination and filtering
   */
  async search(req, res, next) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        name: req.query.name || req.query.query, // Support both name and query params
        dateOfBirth: req.query.dateOfBirth,
        bloodType: req.query.bloodType
      };

      const result = await this.service.search(filters);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all patients with pagination
   */
  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const result = await this.service.findAll({
        page,
        limit
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single patient by ID
   */
  async getById(req, res, next) {
    try {
      const patient = await this.service.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      return res.status(200).json(patient);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(req, res, next) {
    try {
      const patientData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        bloodType: req.body.bloodType,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        address: req.body.address,
        medicalRecordNumber: req.body.medicalRecordNumber,
        notes: req.body.notes
      };

      const patient = await this.service.create(patientData);
      return res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a patient
   */
  async updatePatient(req, res, next) {
    try {
      const patientData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        bloodType: req.body.bloodType,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        address: req.body.address,
        medicalRecordNumber: req.body.medicalRecordNumber,
        notes: req.body.notes
      };

      const updatedPatient = await this.service.update(req.params.id, patientData);
      
      if (!updatedPatient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      return res.status(200).json(updatedPatient);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a patient
   */
  async deletePatient(req, res, next) {
    try {
      await this.service.delete(req.params.id);
      return res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient reports
   */
  async getPatientReports(req, res, next) {
    try {
      const reports = await this.service.getPatientReports(req.params.id);
      return res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get patient caution cards
   */
  async getPatientCautionCards(req, res, next) {
    try {
      const cards = await this.service.getPatientCautionCards(req.params.id);
      return res.status(200).json(cards);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link a report to a patient
   */
  async linkReport(req, res, next) {
    try {
      if (!req.body.reportId) {
        return res.status(400).json({ message: 'Report ID is required' });
      }

      await this.service.linkReport(req.params.id, req.body.reportId);
      return res.status(200).json({ message: 'Report linked successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link a caution card to a patient
   */
  async linkCautionCard(req, res, next) {
    try {
      if (!req.body.cardId) {
        return res.status(400).json({ message: 'Caution card ID is required' });
      }
      
      if (!req.body.updatedBy) {
        return res.status(400).json({ message: 'Updated by information is required' });
      }

      await this.service.linkCautionCard(req.params.id, req.body.cardId);
      return res.status(200).json({ message: 'Caution card linked successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientController(); 