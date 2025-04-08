const logger = require('../utils/logger');
const { ValidationError } = require('../errors/ValidationError');

/**
 * Central error handling middleware
 * Standardizes error responses across the application
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle ValidationError
  if (err instanceof ValidationError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details
    });
  }

  // Handle SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// 404 handler middleware
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, status = 400, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message, errors = null) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(message, 404);
  }

  static conflict(message, errors = null) {
    return new ApiError(message, 409, errors);
  }

  static serverError(message = 'Internal server error', errors = null) {
    return new ApiError(message, 500, errors);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError
};