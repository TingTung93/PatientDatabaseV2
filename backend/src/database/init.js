import pg from 'pg';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';
import config from '../../config/config.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables are loaded in server.js

const { Pool } = pg;

// Initialize SQLite database
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env].database;

const sqliteDbPath = process.env.SQLITE_DB_PATH || dbConfig.path;
const db = new BetterSqlite3(sqliteDbPath, { 
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
  fileMustExist: false // Allow creating new database file if it doesn't exist
});

let pool; // Don't create pool immediately

const createPool = () => {
  try {
    // Debug: Log all relevant environment variables
    logger.info('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'
    });

    // Ensure environment variables are loaded before accessing them
    const poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'patient_info_test',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };

    // Basic check for required variables
    if (!poolConfig.user || !poolConfig.password) {
      logger.error('Missing required PostgreSQL credentials (DB_USER, DB_PASSWORD). Check .env file loading.');
      return null;
    }

    // Log pool configuration (excluding password)
    logger.info('Creating PostgreSQL pool with config:', {
      ...poolConfig,
      password: '[REDACTED]'
    });

    const newPool = new Pool(poolConfig);

    // Test the connection
    newPool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    return newPool;
  } catch (error) {
    logger.error('Error creating PostgreSQL pool:', error);
    return null;
  }
};

const initializeDatabase = async () => {
  try {
    // Create the pool only when initializing
    if (!pool) {
        pool = createPool();
    }
    
    // If pool creation failed (e.g., missing creds), don't proceed with PG connection
    if (!pool) {
        logger.error('PostgreSQL pool creation failed. Skipping PostgreSQL initialization.');
        await initSQLiteTables(); // Initialize SQLite anyway
        logger.info('Database initialization completed (SQLite only)');
        return; 
    }

    // Test the PostgreSQL connection first
    try {
      await pool.query('SELECT NOW()');
      logger.info('PostgreSQL connection successful');

      // Note: We don't need to initialize PostgreSQL tables here anymore
      // as they will be handled by Sequelize model synchronization
      logger.info('PostgreSQL connection ready for Sequelize');

      // Initialize SQLite tables
      await initSQLiteTables();
    } catch (pgError) {
      logger.warn(`PostgreSQL connection failed: ${pgError.message}`);
      logger.warn('Proceeding with SQLite only.');
      // Consider logging pgError.code or the full error in debug mode
      if (pgError.code === '28P01') { // Specific code for auth failure
          logger.error('PostgreSQL Authentication Failed: Check DB_USER and DB_PASSWORD in your loaded .env file.');
      }
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
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL
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
    // Create tables if they don't exist - execute statements separately
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        report_type VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )`);

    await pool.query(`
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
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_data (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES reports(id),
        field_name VARCHAR(100) NOT NULL,
        original_text TEXT NOT NULL,
        corrected_text TEXT NOT NULL,
        confidence_score FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

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
    pool = createPool(); // Recreate pool using the function
    if (!pool) {
        logger.error('Failed to recreate PostgreSQL pool during reset.');
        return null; // Or handle as appropriate
    }
    logger.info('PostgreSQL pool reset.');
    return pool;
  } catch (error) {
    logger.error('Error resetting pool:', error);
    throw error;
  }
};

// Export the database instance and other utilities
export { db, pool, initializeDatabase, resetPool };

// If this file is run directly, initialize the database
// Get the current file path and the entry point script path
const entryPoint = process.argv[1];

if (entryPoint && path.resolve(entryPoint) === path.resolve(__filename)) {
  try {
    initializeDatabase();
    console.log('Database initialization complete');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
} 