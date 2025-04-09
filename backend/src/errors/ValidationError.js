class ValidationError extends Error {
  constructor(message, errors = undefined) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
    
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

export { ValidationError };
export default ValidationError; 