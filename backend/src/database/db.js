import { Sequelize } from 'sequelize';
import logger from '../utils/logger.js';

let sequelize = null; // Initialize as null

// Function to create and configure the Sequelize instance
const initializeSequelize = () => {
  if (sequelize) {
    logger.info('Sequelize instance already initialized.');
    return sequelize;
  }

  // Use environment variables for database configuration
  const dbConfig = {
      development: {
          dialect: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'patient_info_dev',
          logging: (msg) => logger.debug(msg)
      },
      test: {
          dialect: 'sqlite',
          storage: ':memory:',
          logging: false
      },
      production: {
          dialect: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432', 10), // Ensure port is parsed
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          logging: false,
          pool: {
              max: 5,
              min: 0,
              acquire: 30000,
              idle: 10000
          }
      }
  };

  const env = process.env.NODE_ENV || 'development';
  const config = dbConfig[env];

  // Check required config
  if (!config.username || !config.password || !config.database) {
      logger.error('Missing required Sequelize database credentials (DB_USER, DB_PASSWORD, DB_NAME). Check .env file loading.');
      // Prevent sequelize instance creation if critical info is missing
      return null; 
  }

  logger.info('Initializing Sequelize with config:', { 
      dialect: config.dialect, 
      host: config.host, 
      port: config.port, 
      database: config.database, 
      username: config.username, 
      // Do not log password 
  });

  sequelize = new Sequelize(
      config.database,
      config.username,
      config.password, // Password can be undefined here if env var not set, handled by authenticate
      {
          host: config.host,
          port: config.port,
          dialect: config.dialect,
          storage: config.storage,
          logging: config.logging,
          pool: config.pool
      }
  );

  // Test database connection asynchronously
  sequelize
      .authenticate()
      .then(() => {
          logger.info('Sequelize connection established successfully.');
      })
      .catch((err) => {
          logger.error('Unable to connect to the Sequelize database:', err);
          // Log specific error details if helpful
          if (err.original) { // Check if there is an original error object
              logger.error('Original Sequelize Error:', { code: err.original.code, message: err.original.message });
          }
      });
      
  return sequelize;
};

// Function to get the sequelize instance
const getSequelize = () => {
    if (!sequelize) {
        logger.warn('Sequelize instance requested before initialization. Attempting lazy initialization.');
        // Attempt lazy initialization, though ideally initializeSequelize should be called first
        initializeSequelize();
        if (!sequelize) { 
            throw new Error('Sequelize initialization failed. Cannot provide instance.');
        }
    }
    return sequelize;
};

export { initializeSequelize, getSequelize, Sequelize }; 