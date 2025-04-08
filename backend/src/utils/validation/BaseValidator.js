const { ValidationError } = require('../../errors/ValidationError');

class BaseValidator {
  constructor() {
    this.errors = [];
  }

  // Add a validation error
  addError(field, message) {
    this.errors.push({ field, message });
  }

  // Check if there are any validation errors
  hasErrors() {
    return this.errors.length > 0;
  }

  // Get all validation errors
  getErrors() {
    return this.errors;
  }

  // Clear all validation errors
  clearErrors() {
    this.errors = [];
  }

  // Validate required fields
  validateRequired(data, fields) {
    fields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        this.addError(field, `${field} is required`);
      }
    });
  }

  // Validate string length
  validateLength(field, value, min, max) {
    if (value && (value.length < min || value.length > max)) {
      this.addError(field, `${field} must be between ${min} and ${max} characters`);
    }
  }

  // Validate date format
  validateDate(field, value) {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.addError(field, `${field} must be a valid date`);
      }
    }
  }

  // Validate enum values
  validateEnum(field, value, allowedValues) {
    if (value && !allowedValues.includes(value)) {
      this.addError(field, `${field} must be one of: ${allowedValues.join(', ')}`);
    }
  }

  // Validate email format
  validateEmail(field, value) {
    if (value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.addError(field, `${field} must be a valid email address`);
      }
    }
  }

  // Validate phone number format
  validatePhone(field, value) {
    if (value) {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(value)) {
        this.addError(field, `${field} must be a valid phone number`);
      }
    }
  }

  // Validate JSON format
  validateJSON(field, value) {
    if (value) {
      try {
        JSON.parse(value);
      } catch (error) {
        this.addError(field, `${field} must be valid JSON`);
      }
    }
  }

  // Validate numeric range
  validateRange(field, value, min, max) {
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (isNaN(num) || num < min || num > max) {
        this.addError(field, `${field} must be between ${min} and ${max}`);
      }
    }
  }

  // Validate file size (in bytes)
  validateFileSize(field, value, maxSize) {
    if (value && value > maxSize) {
      this.addError(field, `${field} must be less than ${maxSize / (1024 * 1024)}MB`);
    }
  }

  // Validate MIME type
  validateMimeType(field, value, allowedTypes) {
    if (value && !allowedTypes.includes(value)) {
      this.addError(field, `${field} must be one of: ${allowedTypes.join(', ')}`);
    }
  }

  // Throw validation error if there are any errors
  throwIfErrors() {
    if (this.hasErrors()) {
      throw new ValidationError(this.getErrors());
    }
  }
}

module.exports = BaseValidator; 