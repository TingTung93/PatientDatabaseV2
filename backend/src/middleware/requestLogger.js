const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  // Start timing
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('content-length');

    logger.info('Outgoing response', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      size: size ? `${size} bytes` : undefined
    });
  });

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    }
  });

  next(err);
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 1s)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`
      });
    }
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitor
}; 