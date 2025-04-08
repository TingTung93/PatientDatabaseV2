const crypto = require('crypto');

module.exports = {
  upload: {
    tempDir: process.env.UPLOAD_TEMP_DIR || './uploads/temp',
    maxFileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'],
    cleanupInterval: process.env.TEMP_CLEANUP_INTERVAL || 3600000, // 1 hour
    maxFilenameLength: 255,
    sanitizePath: true,
    contentVerification: {
      enabled: true,
      mimeTypeStrict: true,
      magicBytes: {
        'image/jpeg': ['FF D8 FF'],
        'image/png': ['89 50 4E 47'],
        'image/tiff': ['49 49 2A 00', '4D 4D 00 2A'],
        'application/pdf': ['25 50 44 46']
      }
    },
    quarantine: {
      enabled: true,
      directory: process.env.QUARANTINE_DIR || './uploads/quarantine',
      retention: process.env.QUARANTINE_RETENTION || 24 * 60 * 60 * 1000, // 24 hours
      maxSize: process.env.QUARANTINE_MAX_SIZE || 1024 * 1024 * 1024, // 1GB
      cleanupInterval: process.env.QUARANTINE_CLEANUP_INTERVAL || 3600000, // 1 hour
      secureDelete: {
        passes: process.env.SECURE_DELETE_PASSES || 3,
        chunkSize: 64 * 1024 // 64KB
      }
    }
  },
  antivirus: {
    enabled: process.env.ANTIVIRUS_ENABLED || true,
    clamav: {
      host: process.env.CLAMAV_HOST || 'localhost',
      port: process.env.CLAMAV_PORT || 3310,
      timeout: process.env.CLAMAV_TIMEOUT || 60000,
      maxScanSize: process.env.CLAMAV_MAX_SIZE || 100 * 1024 * 1024 // 100MB
    },
    fallbackMode: process.env.ANTIVIRUS_FALLBACK || 'reject' // 'reject' or 'accept'
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW || 900000, // 15 minutes
    maxRequests: process.env.RATE_LIMIT_MAX || 100, // requests per windowMs
    skipFailedRequests: false,
    headers: true,
    keyGenerator: (req) => req.ip
  },
  processing: {
    maxRetries: process.env.PROCESSING_MAX_RETRIES || 3,
    retryDelay: process.env.PROCESSING_RETRY_DELAY || 5000, // 5 seconds
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivSize: 16,
      keyDerivation: {
        iterations: 100000,
        digest: 'sha512'
      },
      rotationInterval: process.env.KEY_ROTATION_INTERVAL || 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    integrity: {
      checksumAlgorithm: 'sha256',
      verifyOnRead: true,
      verifyAfterWrite: true,
      storeChecksums: true
    }
  },
  websocket: {
    maxMessageSize: process.env.WS_MAX_MESSAGE_SIZE || 1024 * 1024, // 1MB
    maxBackpressure: process.env.WS_MAX_BACKPRESSURE || 1024 * 1024, // 1MB
    closeOnError: true,
    pingInterval: 30000,
    pingTimeout: 5000
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    keyPrefix: 'caution-card:'
  }
};