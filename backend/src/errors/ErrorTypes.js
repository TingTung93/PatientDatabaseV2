/**
 * Collection of custom error types that extend the base AppError
 * Each type represents a specific HTTP error scenario with appropriate status codes
 */
const AppError = require('./AppError');

/**
 * 400 Bad Request - Used for general client errors
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request', data = {}) {
    super(message, 400, 'BAD_REQUEST', data);
  }
}

/**
 * 401 Unauthorized - Used for authentication errors
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', data = {}) {
    super(message, 401, 'UNAUTHORIZED', data);
  }
}

/**
 * 403 Forbidden - Used for permissions errors
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', data = {}) {
    super(message, 403, 'FORBIDDEN', data);
  }
}

/**
 * 404 Not Found - Used when a resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', data = {}) {
    super(message, 404, 'NOT_FOUND', data);
  }
}

/**
 * 409 Conflict - Used for resource conflicts
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', data = {}) {
    super(message, 409, 'CONFLICT', data);
  }
}

/**
 * 400 Bad Request - Specifically for validation errors with detailed info
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR', { errors });
  }
}

/**
 * 500 Internal Server Error - For database-related errors
 */
class DatabaseError extends AppError {
  constructor(message = 'Database error occurred', error = null) {
    // Strip sensitive info from error for security
    const sanitizedError = error ? { 
      message: error.message,
      code: error.code 
    } : null;
    
    super(message, 500, 'DATABASE_ERROR', { error: sanitizedError });
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  DatabaseError
};