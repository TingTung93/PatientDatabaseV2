/**
 * Base error class for API errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request Error
 */
class BadRequestError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

/**
 * 401 Unauthorized Error
 */
class UnauthorizedError extends AppError {
  constructor(message, details = {}) {
    super(message, 401, details);
  }
}

/**
 * 403 Forbidden Error
 */
class ForbiddenError extends AppError {
  constructor(message, details = {}) {
    super(message, 403, details);
  }
}

/**
 * 404 Not Found Error
 */
class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, 404, details);
  }
}

/**
 * 409 Conflict Error
 */
class ConflictError extends AppError {
  constructor(message, details = {}) {
    super(message, 409, details);
  }
}

/**
 * 400 Validation Error
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

/**
 * 500 Database Error
 */
class DatabaseError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  DatabaseError
}; 