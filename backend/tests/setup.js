// Increase timeout for all tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'patient_info_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Global test utilities
global.generateTestToken = (userId = 1, role = 'admin') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET);
};

// Clean up after each test
afterEach(async () => {
  // Add any cleanup logic here
});

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 