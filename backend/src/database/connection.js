const path = require('path');
const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

// Get environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize({
  ...dbConfig,
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 1,
    idle: Infinity,
    maxUses: Infinity
  }
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    // Sync all models
    await sequelize.sync();
    logger.info('Database synchronized successfully.');
  } catch (error) {
    logger.error('Error synchronizing database:', error);
    throw error;
  }
}

// Export connection and initialization functions
module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.initializeDatabase = initializeDatabase;