module.exports = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'patient_info_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres'
  },
  server: {
    port: process.env.TEST_SERVER_PORT || 5001
  },
  upload: {
    tempDir: './uploads/temp',
    cautionCardsDir: './uploads/caution-cards',
    reportsDir: './uploads/reports'
  }
}; 