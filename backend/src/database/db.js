const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Use environment variables for database configuration
const dbConfig = {
    development: {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'patient_db',
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
        port: process.env.DB_PORT,
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

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        storage: config.storage,
        logging: config.logging,
        pool: config.pool
    }
);

// Test database connection
sequelize
    .authenticate()
    .then(() => {
        logger.info('Database connection established successfully.');
    })
    .catch((err) => {
        logger.error('Unable to connect to the database:', err);
    });

module.exports = {
    sequelize,
    Sequelize
}; 