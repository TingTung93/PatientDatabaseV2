const { StatusCodes } = require('http-status-codes');

const notFoundMiddleware = (req, res) => {
  return res.status(StatusCodes.NOT_FOUND).json({ 
    message: `Route not found: ${req.method} ${req.originalUrl}` 
  });
};

module.exports = {
  notFoundMiddleware
}; 