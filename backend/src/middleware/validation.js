const { PatientValidator, ReportValidator, CautionCardValidator, UserValidator, RoleValidator } = require('../utils/validation');
const { ValidationError } = require('../errors/ValidationError');
const { body, validationResult } = require('express-validator');

/**
 * Creates validation middleware for a specific validator
 * @param {Object} validator - Validator instance
 * @param {string} method - Validation method to call (validate or validateUpdate)
 * @returns {Function} Express middleware
 */
const createValidationMiddleware = (validator, method = 'validate') => {
  return (req, res, next) => {
    try {
      const data = method === 'validate' ? req.body : req.body;
      const result = validator[method](data);

      if (!result.isValid) {
        throw new ValidationError('Validation failed', result.errors);
      }

      // Add validated data to request for use in controllers
      req.validatedData = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Creates file validation middleware
 * @param {Object} validator - Validator instance with validateFileMetadata method
 * @returns {Function} Express middleware
 */
const createFileValidationMiddleware = (validator) => {
  return (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded', {
          file: 'File is required'
        });
      }

      const result = validator.validateFileMetadata(req.file);

      if (!result.isValid) {
        throw new ValidationError('File validation failed', result.errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Pre-configured middleware for each validator
const patientValidation = createValidationMiddleware(new PatientValidator());
const patientUpdateValidation = createValidationMiddleware(new PatientValidator(), 'validateUpdate');

const reportValidation = createValidationMiddleware(new ReportValidator());
const reportUpdateValidation = createValidationMiddleware(new ReportValidator(), 'validateUpdate');
const reportFileValidation = createFileValidationMiddleware(new ReportValidator());

const cautionCardValidation = createValidationMiddleware(new CautionCardValidator());
const cautionCardUpdateValidation = createValidationMiddleware(new CautionCardValidator(), 'validateUpdate');
const cautionCardFileValidation = createFileValidationMiddleware(new CautionCardValidator());

// Export pre-configured middleware for each validator
module.exports = {
  // Patient validation
  validatePatient: patientValidation,
  validatePatientUpdate: patientUpdateValidation,

  // Report validation
  validateReport: reportValidation,
  validateReportUpdate: reportUpdateValidation,
  validateReportFile: reportFileValidation,

  // Caution card validation
  validateCautionCard: cautionCardValidation,
  validateCautionCardUpdate: cautionCardUpdateValidation,
  validateCautionCardFile: cautionCardFileValidation,

  // User validation middleware
  validateUser: createValidationMiddleware(new UserValidator()),
  validateUserUpdate: createValidationMiddleware(new UserValidator(), 'validateUpdate'),
  validateUserLogin: createValidationMiddleware(new UserValidator(), 'validateLogin'),
  validatePasswordReset: createValidationMiddleware(new UserValidator(), 'validatePasswordReset'),
  validatePasswordChange: createValidationMiddleware(new UserValidator(), 'validatePasswordChange'),
  
  // Role validation middleware
  validateRole: createValidationMiddleware(new RoleValidator()),
  validateRoleUpdate: createValidationMiddleware(new RoleValidator(), 'validateUpdate'),
  validatePermissionAssignment: createValidationMiddleware(new RoleValidator(), 'validatePermissionAssignment'),
  
  // Utility functions
  createValidationMiddleware,
  createFileValidationMiddleware
}; 