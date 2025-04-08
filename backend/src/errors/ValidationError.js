class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Format errors for API response
  toJSON() {
    return {
      status: 'error',
      code: this.statusCode,
      message: this.message,
      errors: this.errors
    };
  }
}

module.exports = ValidationError; 