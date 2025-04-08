// backend/src/middleware/wsAuth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * WebSocket authentication middleware
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Next function to continue or reject connection
 */
const wsAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const env = process.env.NODE_ENV || 'development';
    jwt.verify(token, config[env].jwt.secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return next(new Error('Token expired'));
        }
        return next(new Error('Invalid token'));
      }

      // Attach user data to socket
      socket.user = decoded;
      next();
    });
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

module.exports = wsAuthMiddleware;