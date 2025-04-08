/**
 * Standard HTTP error responses utility
 * 
 * Provides consistent error response functions for express controllers
 * Used when directly responding with errors instead of throwing them
 */

/**
 * Format an error response with consistent structure
 */
const formatErrorResponse = (message, code, details = {}, statusCode = 500) => {
  return {
    status: 'error',
    code,
    message,
    ...(Object.keys(details).length > 0 && { details }),
  };
};

/**
 * 400 Bad Request
 */
const badRequest = (res, message = 'Bad request', code = 'BAD_REQUEST', details = {}) => {
  return res.status(400).json(formatErrorResponse(message, code, details, 400));
};

/**
 * 401 Unauthorized
 */
const unauthorized = (res, message = 'Authentication required', code = 'UNAUTHORIZED', details = {}) => {
  return res.status(401).json(formatErrorResponse(message, code, details, 401));
};

/**
 * 403 Forbidden
 */
const forbidden = (res, message = 'Access forbidden', code = 'FORBIDDEN', details = {}) => {
  return res.status(403).json(formatErrorResponse(message, code, details, 403));
};

/**
 * 404 Not Found
 */
const notFound = (res, message = 'Resource not found', code = 'NOT_FOUND', details = {}) => {
  return res.status(404).json(formatErrorResponse(message, code, details, 404));
};

/**
 * 409 Conflict 
 */
const conflict = (res, message = 'Resource conflict', code = 'CONFLICT', details = {}) => {
  return res.status(409).json(formatErrorResponse(message, code, details, 409));
};

/**
 * 422 Unprocessable Entity - for validation errors
 */
const validationError = (res, message = 'Validation failed', errors = []) => {
  return res.status(422).json(
    formatErrorResponse(message, 'VALIDATION_ERROR', { errors }, 422)
  );
};

/**
 * 500 Internal Server Error
 */
const serverError = (res, message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details = {}) => {
  return res.status(500).json(formatErrorResponse(message, code, details, 500));
};

module.exports = {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  serverError,
  formatErrorResponse
};