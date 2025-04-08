const { validateEnvironment, EnvValidationError } = require('../envValidator');

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('validates required environment variables successfully', () => {
    process.env = {
      PORT: '3000',
      NODE_ENV: 'development',
      FILE_ENCRYPTION_KEY: 'test-key',
      SECURE_KEY_ROTATION_DAYS: '30',
      TLS_CERT_PATH: './certs/server.crt',
      TLS_KEY_PATH: './certs/server.key',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'password',
      REDIS_TLS: 'false',
      REDIS_MAX_RETRIES: '3',
      UPLOAD_TEMP_DIR: './uploads/temp',
      MAX_FILE_SIZE: '10485760',
      TEMP_CLEANUP_INTERVAL: '3600000',
      PROCESSING_MAX_RETRIES: '3',
      PROCESSING_ENCRYPTION_KEY_SIZE: '32'
    };

    const config = validateEnvironment();
    expect(config).toBeDefined();
    expect(config.PORT).toBe(3000);
    expect(config.REDIS_TLS).toBe(false);
  });

  test('throws error for missing required variables', () => {
    process.env = {};

    expect(() => validateEnvironment()).toThrow(EnvValidationError);
    expect(() => validateEnvironment()).toThrow(/FILE_ENCRYPTION_KEY is required/);
  });

  test('validates port numbers correctly', () => {
    process.env = {
      ...process.env,
      PORT: '0',
    };

    expect(() => validateEnvironment()).toThrow(/PORT must be between 1 and 65535/);

    process.env.PORT = '65536';
    expect(() => validateEnvironment()).toThrow(/PORT must be between 1 and 65535/);
  });

  test('validates boolean values correctly', () => {
    process.env = {
      ...process.env,
      REDIS_TLS: 'invalid'
    };

    expect(() => validateEnvironment()).toThrow(/REDIS_TLS must be 'true' or 'false'/);
  });

  test('validates numeric values correctly', () => {
    process.env = {
      ...process.env,
      MAX_FILE_SIZE: 'not-a-number'
    };

    expect(() => validateEnvironment()).toThrow(/MAX_FILE_SIZE must be a number/);
  });

  test('returns validated and typed configuration object', () => {
    process.env = {
      PORT: '3000',
      REDIS_TLS: 'true',
      MAX_FILE_SIZE: '1048576',
      PROCESSING_MAX_RETRIES: '5'
    };

    const config = validateEnvironment();
    expect(typeof config.PORT).toBe('number');
    expect(typeof config.REDIS_TLS).toBe('boolean');
    expect(typeof config.MAX_FILE_SIZE).toBe('number');
    expect(typeof config.PROCESSING_MAX_RETRIES).toBe('number');
  });
});