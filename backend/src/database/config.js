const path = require('path');
require('dotenv').config();

const config = {
  development: {
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'patient_info_dev',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
      timestamps: true,
      paranoid: true, // Enable soft deletes
      underscored: true,
    },
  },
  test: {
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'patient_info_test',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: false,
    define: {
      timestamps: true,
      paranoid: true,
      underscored: true,
    },
  },
  production: {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    define: {
      timestamps: true,
      paranoid: true,
      underscored: true,
    },
  },
};

module.exports = config; 