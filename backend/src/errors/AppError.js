/**
 * Base application error class that extends the native Error object
 * Used as a base for all custom errors in the application
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.isOperational = true; // Flag to determine if error is operational or programming

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;