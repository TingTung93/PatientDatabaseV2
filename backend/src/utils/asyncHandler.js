/**
 * Wraps an async route handler to catch errors and pass them to Express error handling
 * @param {Function} fn async route handler function
 * @returns {Function} wrapped route handler
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  asyncHandler
};