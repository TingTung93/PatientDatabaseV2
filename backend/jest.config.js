/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**/*.js',
    '!src/database/seed.js'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};