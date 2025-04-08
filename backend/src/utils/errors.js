class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = {}) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

class OcrError extends AppError {
  constructor(message, details = null) {
    super(message, 500);
    this.details = details;
  }
}

class FileProcessingError extends AppError {
  constructor(message, details = null) {
    super(message, 500);
    this.details = details;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  OcrError,
  FileProcessingError
}; 