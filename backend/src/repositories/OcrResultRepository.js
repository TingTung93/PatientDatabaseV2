/**
 * OCR Result Repository
 * 
 * Handles database operations for OCR results
 */
const { v4: uuidv4 } = require('uuid');

const { OcrResult, Patient } = require('../database/models');
const logger = require('../utils/logger');

class OcrResultRepository {
  /**
   * Create a new OCR result
   * 
   * @param {Object} data - OCR result data
   * @returns {Promise<Object>} Created OCR result
   */
  async create(data) {
    try {
      const result = await OcrResult.create(data);
      logger.debug('Created OCR result', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Error creating OCR result:', error);
      throw error;
    }
  }

  /**
   * Find OCR result by ID
   * 
   * @param {string} id - OCR result ID
   * @returns {Promise<Object|null>} OCR result or null if not found
   */
  async findById(id) {
    try {
      return await OcrResult.findByPk(id);
    } catch (error) {
      logger.error('Error finding OCR result by ID:', error);
      throw error;
    }
  }

  /**
   * Find OCR results by patient ID
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Array of OCR results
   */
  async findByPatientId(patientId) {
    try {
      return await OcrResult.findAll({
        where: { patientId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      logger.error('Error finding OCR results by patient ID:', error);
      throw error;
    }
  }

  /**
   * Find OCR result by image path
   * 
   * @param {string} imagePath - Path to the image
   * @returns {Promise<Object|null>} OCR result or null if not found
   */
  async findByImagePath(imagePath) {
    try {
      const result = await OcrResult.findOne({
        where: { imagePath },
        include: [
          {
            model: Patient,
            as: 'patient',
          },
        ],
      });
      return result;
    } catch (error) {
      logger.error('Failed to find OCR result by image path', { error: error.message, imagePath });
      throw error;
    }
  }

  /**
   * Update OCR result
   * 
   * @param {string} id - OCR result ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated OCR result
   */
  async update(id, data) {
    try {
      const result = await OcrResult.findByPk(id);
      if (!result) {
        throw new Error('OCR result not found');
      }
      await result.update(data);
      logger.debug('Updated OCR result', { id });
      return result;
    } catch (error) {
      logger.error('Error updating OCR result:', error);
      throw error;
    }
  }

  /**
   * Delete OCR result
   * 
   * @param {string} id - OCR result ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    try {
      const result = await OcrResult.findByPk(id);
      if (!result) {
        throw new Error('OCR result not found');
      }
      await result.destroy();
      logger.debug('Deleted OCR result', { id });
      return true;
    } catch (error) {
      logger.error('Error deleting OCR result:', error);
      throw error;
    }
  }

  /**
   * Get latest OCR result for a patient
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object|null>} Latest OCR result or null if not found
   */
  async getLatestForPatient(patientId) {
    try {
      return await OcrResult.findOne({
        where: { patientId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      logger.error('Error getting latest OCR result for patient:', error);
      throw error;
    }
  }
}

module.exports = OcrResultRepository;