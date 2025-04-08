const winston = require('winston');
const { createLogger, format, transports } = winston;
const path = require('path');

class ErrorHandler {
  constructor() {
    this.logger = this.setupLogger();
    this.subscribers = new Set();
  }

  setupLogger() {
    const logDir = process.env.LOG_DIR || 'logs';
    const errorLogPath = path.join(logDir, 'error.log');
    const combinedLogPath = path.join(logDir, 'combined.log');

    return createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: 'caution-card-service' },
      transports: [
        new transports.File({
          filename: errorLogPath,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new transports.File({
          filename: combinedLogPath,
          maxsize: 5242880,
          maxFiles: 5,
        }),
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        })
      ]
    });
  }

  logError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString(),
      ...context
    };

    this.logger.error(errorInfo);
    this.notifySubscribers(errorInfo);

    return errorInfo;
  }

  logWarning(message, context = {}) {
    const warningInfo = {
      message,
      timestamp: new Date().toISOString(),
      ...context
    };

    this.logger.warn(warningInfo);
    return warningInfo;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(errorInfo) {
    this.subscribers.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (error) {
        this.logger.error('Error in subscriber callback:', error);
      }
    });
  }

  createErrorResponse(error, includeStack = false) {
    const response = {
      status: 'error',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      requestId: error.requestId || undefined
    };

    if (includeStack && process.env.NODE_ENV !== 'production') {
      response.stack = error.stack;
    }

    return response;
  }

  async handleRetry(operation, retryOptions = {}) {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = () => true
    } = retryOptions;

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const retryDelay = delay * Math.pow(backoff, attempt - 1);
        this.logWarning(`Retry attempt ${attempt}/${maxRetries} after ${retryDelay}ms`, {
          error: error.message,
          attempt,
          nextRetryDelay: retryDelay
        });

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  static formatError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        stack: error.stack
      };
    }
    return {
      message: String(error),
      code: 'UNKNOWN_ERROR'
    };
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export singleton instance
module.exports = errorHandler;