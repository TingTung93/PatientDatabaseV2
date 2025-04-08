const { StatusCodes } = require('http-status-codes');
const { ValidationError, NotFoundError } = require('../errors');

const errorHandlerMiddleware = (err, req, res, next) => {
  console.error('Error:', err);
  
  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || 'Something went wrong, please try again later'
  };
  
  // Handle specific error types
  if (err instanceof ValidationError) {
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }
  
  if (err instanceof NotFoundError) {
    customError.statusCode = StatusCodes.NOT_FOUND;
  }
  
  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    customError.statusCode = StatusCodes.BAD_REQUEST;
    customError.message = 'File too large. Maximum size is 20MB';
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    customError.statusCode = StatusCodes.BAD_REQUEST;
    customError.message = 'Unexpected file upload';
  }
  
  // Handle SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    customError.statusCode = StatusCodes.BAD_REQUEST;
    customError.message = 'Database constraint violation';
    
    if (err.message.includes('UNIQUE')) {
      customError.message = 'A record with this data already exists';
    }
    
    if (err.message.includes('FOREIGN KEY')) {
      customError.message = 'Related record not found';
    }
  }
  
  return res.status(customError.statusCode).json({ message: customError.message });
};

module.exports = {
  errorHandlerMiddleware
}; 