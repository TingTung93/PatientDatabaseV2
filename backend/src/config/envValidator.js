/**
 * Environment Variable Validator
 * Validates required environment variables and their types/values
 */

class EnvValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

const validateNumber = (value, name) => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new EnvValidationError(`${name} must be a number`);
  }
  return num;
};

const validateBoolean = (value, name) => {
  if (value !== 'true' && value !== 'false') {
    throw new EnvValidationError(`${name} must be 'true' or 'false'`);
  }
  return value === 'true';
};

const validateString = (value, name, required = true) => {
  if (required && !value) {
    throw new EnvValidationError(`${name} is required`);
  }
  return value;
};

const validateUrl = (value, name) => {
  try {
    new URL(value);
    return value;
  } catch (error) {
    throw new EnvValidationError(`${name} must be a valid URL`);
  }
};

const validatePort = (value, name) => {
  const port = validateNumber(value, name);
  if (port < 1 || port > 65535) {
    throw new EnvValidationError(`${name} must be between 1 and 65535`);
  }
  return port;
};

const validateEnvironment = () => {
  const validations = {
    // Server Configuration
    PORT: () => validatePort(process.env.PORT || '3000', 'PORT'),
    NODE_ENV: () => validateString(process.env.NODE_ENV, 'NODE_ENV'),

    // Security
    FILE_ENCRYPTION_KEY: () => validateString(process.env.FILE_ENCRYPTION_KEY, 'FILE_ENCRYPTION_KEY'),
    SECURE_KEY_ROTATION_DAYS: () => validateNumber(process.env.SECURE_KEY_ROTATION_DAYS, 'SECURE_KEY_ROTATION_DAYS'),
    TLS_CERT_PATH: () => validateString(process.env.TLS_CERT_PATH, 'TLS_CERT_PATH'),
    TLS_KEY_PATH: () => validateString(process.env.TLS_KEY_PATH, 'TLS_KEY_PATH'),

    // Redis Configuration
    REDIS_HOST: () => validateString(process.env.REDIS_HOST, 'REDIS_HOST'),
    REDIS_PORT: () => validatePort(process.env.REDIS_PORT, 'REDIS_PORT'),
    REDIS_PASSWORD: () => validateString(process.env.REDIS_PASSWORD, 'REDIS_PASSWORD'),
    REDIS_TLS: () => validateBoolean(process.env.REDIS_TLS || 'false', 'REDIS_TLS'),
    REDIS_MAX_RETRIES: () => validateNumber(process.env.REDIS_MAX_RETRIES, 'REDIS_MAX_RETRIES'),

    // Upload Configuration
    UPLOAD_TEMP_DIR: () => validateString(process.env.UPLOAD_TEMP_DIR, 'UPLOAD_TEMP_DIR'),
    MAX_FILE_SIZE: () => validateNumber(process.env.MAX_FILE_SIZE, 'MAX_FILE_SIZE'),
    TEMP_CLEANUP_INTERVAL: () => validateNumber(process.env.TEMP_CLEANUP_INTERVAL, 'TEMP_CLEANUP_INTERVAL'),

    // Processing Configuration
    PROCESSING_MAX_RETRIES: () => validateNumber(process.env.PROCESSING_MAX_RETRIES, 'PROCESSING_MAX_RETRIES'),
    PROCESSING_ENCRYPTION_KEY_SIZE: () => validateNumber(process.env.PROCESSING_ENCRYPTION_KEY_SIZE, 'PROCESSING_ENCRYPTION_KEY_SIZE'),
  };

  const errors = [];
  const config = {};

  // Validate each environment variable
  Object.entries(validations).forEach(([key, validator]) => {
    try {
      config[key] = validator();
    } catch (error) {
      errors.push(error.message);
    }
  });

  if (errors.length > 0) {
    throw new EnvValidationError(
      'Environment validation failed:\n' + errors.map(err => `- ${err}`).join('\n')
    );
  }

  return config;
};

module.exports = {
  validateEnvironment,
  EnvValidationError
};