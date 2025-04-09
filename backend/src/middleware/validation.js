import { PatientValidator, ReportValidator, CautionCardValidator, UserValidator, RoleValidator } from '../utils/validation/index.js';
import { ValidationError } from '../errors/ValidationError.js';
import { body, validationResult } from 'express-validator';

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
const validatePatient = createValidationMiddleware(new PatientValidator());
const validatePatientUpdate = createValidationMiddleware(new PatientValidator(), 'validateUpdate');

const validateReport = createValidationMiddleware(new ReportValidator());
const validateReportUpdate = createValidationMiddleware(new ReportValidator(), 'validateUpdate');
const validateReportFile = createFileValidationMiddleware(new ReportValidator());

const validateCautionCard = createValidationMiddleware(new CautionCardValidator());
const validateCautionCardUpdate = createValidationMiddleware(new CautionCardValidator(), 'validateUpdate');
const validateCautionCardFile = createFileValidationMiddleware(new CautionCardValidator());

const validateUser = createValidationMiddleware(new UserValidator());
const validateUserUpdate = createValidationMiddleware(new UserValidator(), 'validateUpdate');
const validateUserLogin = createValidationMiddleware(new UserValidator(), 'validateLogin');
const validatePasswordReset = createValidationMiddleware(new UserValidator(), 'validatePasswordReset');
const validatePasswordChange = createValidationMiddleware(new UserValidator(), 'validatePasswordChange');

const validateRole = createValidationMiddleware(new RoleValidator());
const validateRoleUpdate = createValidationMiddleware(new RoleValidator(), 'validateUpdate');
const validatePermissionAssignment = createValidationMiddleware(new RoleValidator(), 'validatePermissionAssignment');

export {
  // Patient validation
  validatePatient,
  validatePatientUpdate,

  // Report validation
  validateReport,
  validateReportUpdate,
  validateReportFile,

  // Caution card validation
  validateCautionCard,
  validateCautionCardUpdate,
  validateCautionCardFile,

  // User validation middleware
  validateUser,
  validateUserUpdate,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordChange,

  // Role validation middleware
  validateRole,
  validateRoleUpdate,
  validatePermissionAssignment,

  // Utility functions
  createValidationMiddleware,
  createFileValidationMiddleware
}; 