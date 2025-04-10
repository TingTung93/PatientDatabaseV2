import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { ensureDir } from 'fs-extra';
import { getConfig } from '../config/index.js';
import { log } from '../utils/logging.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables are loaded in server.js

const { Pool } = pg;

const appConfig = getConfig();

let dbInstance = null;

// Export a getter for db that will always return the current dbInstance
export const db = {
  get instance() {
    return dbInstance;
  }
};

// Add these lines at the beginning of the file to have more verbose output
console.log('Starting database initialization...');
console.log('Loading database connection from init.js');

/**
 * Get the SQLite database path from environment variables or config
 * @returns {string} The database file path
 */
export function getSQLitePath() {
  // Use environment variable or config setting for the database path
  const dbPath = process.env.SQLITE_DB_PATH || appConfig?.database?.sqlite?.path;
  
  if (!dbPath) {
    const defaultPath = path.join(__dirname, '../../../data/patients.sqlite');
    log.warn(`No SQLite path specified, using default: ${defaultPath}`);
    return defaultPath;
  }
  
  return dbPath;
}

/**
 * Initialize SQLite database
 * @returns {Promise<Object>} The SQLite database instance
 */
export async function initSQLite() {
  // If we already have an instance, return it
  if (dbInstance) {
    return dbInstance;
  }
  
  const dbPath = getSQLitePath();
  
  // Ensure the directory exists
  await ensureDir(path.dirname(dbPath));
  
  try {
    log.info(`Initializing SQLite database at ${dbPath}`);
    
    // Configure SQLite with verbose logging in development
    const verbose = process.env.NODE_ENV === 'development' 
      ? sqlite3.verbose() 
      : sqlite3;
    
    // Open database connection using sqlite wrapper for promises
    dbInstance = await open({
      filename: dbPath,
      driver: verbose.Database
    });
    
    // Enable foreign keys
    await dbInstance.exec('PRAGMA foreign_keys = ON;');
    
    await initSQLiteTables(dbInstance);
    
    return dbInstance;
  } catch (error) {
    log.error('Error initializing SQLite database:', error);
    throw error;
  }
}

let pool; // Don't create pool immediately

const createPool = () => {
  try {
    // Debug: Log all relevant environment variables
    log.info('Environment variables:', {
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
      log.error('Missing required PostgreSQL credentials (DB_USER, DB_PASSWORD). Check .env file loading.');
      return null;
    }

    // Log pool configuration (excluding password)
    log.info('Creating PostgreSQL pool with config:', {
      ...poolConfig,
      password: '[REDACTED]'
    });

    const newPool = new Pool(poolConfig);

    // Test the connection
    newPool.on('error', (err) => {
      log.error('Unexpected error on idle PostgreSQL client', err);
    });

    return newPool;
  } catch (error) {
    log.error('Error creating PostgreSQL pool:', error);
    return null;
  }
};

const initializeDatabase = async () => {
  try {
    // Initialize SQLite first
    dbInstance = await initSQLite();
    
    // Create the pool only when initializing
    if (!pool) {
        pool = createPool();
    }
    
    // If pool creation failed (e.g., missing creds), don't proceed with PG connection
    if (!pool) {
        log.error('PostgreSQL pool creation failed. Skipping PostgreSQL initialization.');
        log.info('Database initialization completed (SQLite only)');
        return; 
    }

    // Test the PostgreSQL connection
    try {
      await pool.query('SELECT NOW()');
      log.info('PostgreSQL connection successful');
      log.info('PostgreSQL connection ready for Sequelize');
    } catch (pgError) {
      log.warn(`PostgreSQL connection failed: ${pgError.message}`);
      log.warn('Proceeding with SQLite only.');
      // Consider logging pgError.code or the full error in debug mode
      if (pgError.code === '28P01') { // Specific code for auth failure
          log.error('PostgreSQL Authentication Failed: Check DB_USER and DB_PASSWORD in your loaded .env file.');
      }
    }

    log.info('Database initialization completed');
  } catch (error) {
    log.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Initialize all required SQLite tables
 * @param {Object} db The SQLite database instance
 */
export async function initSQLiteTables(db) {
  log.info('Initializing SQLite tables...');
  
  try {
    // Create patients table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        gender TEXT,
        contact_number TEXT,
        email TEXT,
        address TEXT,
        emergency_contact TEXT,
        blood_type TEXT,
        allergies TEXT,
        medical_conditions TEXT,
        medications TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create reports table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
      )
    `);
    
    // Create caution_cards table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS caution_cards (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
      )
    `);
    
    // Create events table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
      )
    `);
    
    // Create any necessary indexes
    await createIndexes(db);

    log.info('SQLite tables initialized successfully');
  } catch (error) {
    log.error('Error initializing SQLite tables:', error);
    throw error;
  }
}

/**
 * Create database indexes
 * @param {Object} db The SQLite database instance
 */
async function createIndexes(db) {
  // Create indexes to improve query performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (last_name, first_name);
    CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports (patient_id);
    CREATE INDEX IF NOT EXISTS idx_caution_cards_patient_id ON caution_cards (patient_id);
    CREATE INDEX IF NOT EXISTS idx_events_patient_id ON events (patient_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events (event_date);
  `);
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

    log.info('PostgreSQL tables created successfully');
  } catch (error) {
    log.error('Error creating PostgreSQL tables:', error);
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
        log.error('Failed to recreate PostgreSQL pool during reset.');
        return null; // Or handle as appropriate
    }
    log.info('PostgreSQL pool reset.');
    return pool;
  } catch (error) {
    log.error('Error resetting pool:', error);
    throw error;
  }
};

// Export the database instance and other utilities
export { dbInstance, pool, initializeDatabase, resetPool };

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