/**
 * Patient Service
 * This service encapsulates all business logic related to patient operations.
 */
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  DatabaseError
} = require('../errors/ErrorTypes');
const BaseService = require('./BaseService');
const { ValidationError } = require('../errors/ValidationError');

class PatientService extends BaseService {
  /**
   * Create a new PatientService instance
   * @param {Object} patientRepository - Instance of PatientRepository
   */
  constructor(patientRepository) {
    super(patientRepository);
  }

  /**
   * Search patients based on criteria
   * @param {Object} options - Search options
   * @param {string} [options.name] - Patient name to search for
   * @param {string} [options.medicalRecordNumber] - Medical record number
   * @param {string} [options.dateOfBirth] - Date of birth
   * @param {number} [options.limit] - Number of results per page
   * @param {number} [options.offset] - Number of results to skip
   * @returns {Promise<Object>} - Object containing search results and pagination info
   */
  async searchPatients(options = {}) {
    try {
      console.log('PatientService.searchPatients called with options:', options);
      
      if (!this.repository) {
        throw new Error('Patient repository is not initialized');
      }
      
      const result = await this.repository.searchPatients(options);
      
      if (!result) {
        return {
          patients: [],
          total: 0,
          limit: options.limit || 25,
          offset: options.offset || 0
        };
      }
      
      return {
        patients: result.patients || [],
        total: result.total || 0,
        limit: result.limit || options.limit || 25,
        offset: result.offset || options.offset || 0
      };
    } catch (error) {
      console.error('Error in PatientService.searchPatients:', error);
      throw new DatabaseError('Failed to search patients', error);
    }
  }

  /**
   * Create a new patient
   * @param {Object} patientData - Data for the new patient
   * @param {string} userId - ID of the user creating the patient
   * @returns {Promise<Object>} - The created patient
   * @throws {BadRequestError} - If required fields are missing
   * @throws {ConflictError} - If a patient with the same medical record number already exists
   */
  async createPatient(patientData, userId) {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'medicalRecordNumber'];
    const missingFields = requiredFields.filter(field => !patientData[field]);
    
    if (missingFields.length > 0) {
      throw new BadRequestError('Missing required fields', {
        required: requiredFields,
        missing: missingFields
      });
    }

    // Check for duplicate medical record number
    const existingPatient = await this.repository.getPatientByMedicalRecordNumber(
      patientData.medicalRecordNumber
    );
    
    if (existingPatient) {
      throw new ConflictError('Patient with this medical record number already exists', {
        medicalRecordNumber: patientData.medicalRecordNumber
      });
    }

    // Create new patient
    try {
      return await this.repository.createPatient(patientData, userId);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to create patient', error);
    }
  }

  /**
   * Get all patients with pagination
   * @param {Object} options - Query options (pagination, sorting, etc.)
   * @returns {Promise<Object>} - Object containing patients array and pagination info
   */
  async getAllPatients(options = {}) {
    try {
      const result = await this.repository.getAllPatients(options);
      
      // Calculate pagination info
      const totalPages = Math.ceil(result.total / result.limit);
      const currentPage = Math.floor(result.offset / result.limit) + 1;
      
      return {
        patients: result.patients,
        total: result.total,
        pages: totalPages,
        currentPage,
        limit: result.limit
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch patients', error);
    }
  }

  /**
   * Get a patient by ID
   * @param {string|number} id - Patient ID
   * @returns {Promise<Object>} - The patient
   * @throws {NotFoundError} - If patient not found
   */
  async getPatientById(id) {
    try {
      const patient = await this.repository.getPatientById(id);
      
      if (!patient) {
        throw new NotFoundError('Patient not found', { id });
      }
      
      return patient;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch patient', error);
    }
  }

  /**
   * Update a patient
   * @param {string|number} id - Patient ID
   * @param {Object} patientData - Updated patient data
   * @param {string} userId - ID of the user updating the patient
   * @returns {Promise<Object>} - The updated patient
   * @throws {NotFoundError} - If patient not found
   * @throws {BadRequestError} - If required fields are missing
   */
  async updatePatient(id, patientData, userId) {
    // If full update (not patch), validate required fields
    if (!patientData.isPatch) {
      const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'medicalRecordNumber'];
      const missingFields = requiredFields.filter(field => !patientData[field]);
      
      if (missingFields.length > 0) {
        throw new BadRequestError('Missing required fields', {
          required: requiredFields,
          missing: missingFields
        });
      }
    }

    // If medical record number is being updated, check for duplicates
    if (patientData.medicalRecordNumber) {
      const existingPatient = await this.repository.getPatientByMedicalRecordNumber(
        patientData.medicalRecordNumber
      );
      
      if (existingPatient && existingPatient.id !== parseInt(id)) {
        throw new ConflictError('Another patient with this medical record number already exists', {
          medicalRecordNumber: patientData.medicalRecordNumber
        });
      }
    }

    // Update patient
    try {
      const updatedPatient = await this.repository.updatePatient(
        id,
        patientData,
        userId
      );
      
      if (!updatedPatient) {
        throw new NotFoundError('Patient not found', { id });
      }
      
      return updatedPatient;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      throw new DatabaseError('Failed to update patient', error);
    }
  }

  /**
   * Delete a patient
   * @param {string|number} id - Patient ID
   * @returns {Promise<boolean>} - True if deleted, exception otherwise
   * @throws {NotFoundError} - If patient not found
   */
  async deletePatient(id) {
    try {
      const deleted = await this.repository.deletePatient(id);
      
      if (!deleted) {
        throw new NotFoundError('Patient not found', { id });
      }
      
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete patient', error);
    }
  }

  async search(filters) {
    const { page = 1, limit = 20, ...searchFilters } = filters;
    const offset = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.repository.search({ ...searchFilters, limit, offset }),
      this.repository.count(searchFilters)
    ]);

    return {
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async create(data) {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'bloodType'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError('Missing required fields', {
        fields: missingFields.map(field => `${field} is required`)
      });
    }

    // Format data for database
    const formattedData = {
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dateOfBirth,
      blood_type: data.bloodType,
      antigen_phenotype: data.antigenPhenotype || null,
      transfusion_restrictions: data.transfusionRestrictions || null,
      antibodies: data.antibodies || null,
      contact_number: data.contactNumber || null,
      email: data.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.repository.create(formattedData);
  }

  async update(id, data) {
    // Format data for database
    const formattedData = {
      first_name: data.firstName,
      last_name: data.lastName,
      date_of_birth: data.dateOfBirth,
      blood_type: data.bloodType,
      antigen_phenotype: data.antigenPhenotype || null,
      transfusion_restrictions: data.transfusionRestrictions || null,
      antibodies: data.antibodies || null,
      contact_number: data.contactNumber || null,
      email: data.email || null,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(formattedData).forEach(key => 
      formattedData[key] === undefined && delete formattedData[key]
    );

    return this.repository.update(id, formattedData);
  }

  async getPatientReports(patientId) {
    return this.repository.getPatientReports(patientId);
  }

  async getPatientCautionCards(patientId) {
    return this.repository.getPatientCautionCards(patientId);
  }

  async linkReport(patientId, reportId) {
    return this.repository.linkReport(patientId, reportId);
  }

  async linkCautionCard(patientId, cardId) {
    return this.repository.linkCautionCard(patientId, cardId);
  }
}

module.exports = PatientService;