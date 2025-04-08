const { Pool } = require('pg');
const BetterSqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
require('dotenv').config();

// Initialize SQLite database
const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config');
const dbConfig = config[env].database;

const sqliteDbPath = process.env.SQLITE_DB_PATH || dbConfig.path;
const db = new BetterSqlite3(sqliteDbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  fileMustExist: false // Allow creating new database file if it doesn't exist
});

// Create a new pool for PostgreSQL (for compatibility with existing code)
const createPool = () => {
  const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'patient_info_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  // Log pool configuration (excluding password)
  logger.info('Creating database pool with config:', {
    ...poolConfig,
    password: '[REDACTED]'
  });

  return new Pool(poolConfig);
};

let pool = createPool();

const initializeDatabase = async () => {
  try {
    // Initialize SQLite tables
    initSQLiteTables();

    // Test the PostgreSQL connection if available
    try {
      await pool.query('SELECT NOW()');
      logger.info('PostgreSQL connection successful');

      // Initialize PostgreSQL tables
      await initPostgresTables();
    } catch (pgError) {
      logger.warn('PostgreSQL connection failed, using SQLite only:', pgError.message);
    }

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize SQLite tables
function initSQLiteTables() {
  try {
    // Create patients table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        species TEXT,
        breed TEXT,
        bloodType TEXT,
        mrn TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `).run();

    // Create reports table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        title TEXT NOT NULL,
        content TEXT,
        filePath TEXT,
        reportType TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
      )
    `).run();

    // Create caution_cards table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS caution_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        image_path TEXT,
        file_name TEXT,
        mime_type TEXT,
        blood_type TEXT,
        created_at TEXT,
        updated_at TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      )
    `).run();

    // Create events table for real-time event system if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `).run();

    // Create indexes for efficient querying
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_version ON events (version)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_type ON events (type)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at)').run();

    logger.info('SQLite tables created successfully');
  } catch (error) {
    logger.error('Error creating SQLite tables:', error);
    throw error;
  }
}

// Initialize PostgreSQL tables (for compatibility with existing code)
async function initPostgresTables() {
  try {
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        report_type VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS caution_cards (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        blood_type VARCHAR(5),
        antibodies JSONB,
        transfusion_requirements JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        file_name VARCHAR(255),
        file_path VARCHAR(255),
        ocr_text TEXT,
        metadata JSONB,
        reviewed_by VARCHAR(100),
        reviewed_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_data (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES reports(id),
        field_name VARCHAR(100) NOT NULL,
        original_text TEXT NOT NULL,
        corrected_text TEXT NOT NULL,
        confidence_score FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    logger.info('PostgreSQL tables created successfully');
  } catch (error) {
    logger.error('Error creating PostgreSQL tables:', error);
    throw error;
  }
}

// Reset pool connection (useful for tests)
const resetPool = async () => {
  try {
    if (pool) {
      await pool.end();
    }
    pool = createPool();
    return pool;
  } catch (error) {
    logger.error('Error resetting pool:', error);
    throw error;
  }
};

// Export functions and the pool
module.exports = {
  db,
  pool,
  initializeDatabase,
  resetPool
};

// If this file is run directly, initialize the database
if (require.main === module) {
  try {
    initializeDatabase();
    console.log('Database initialization complete');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
} 