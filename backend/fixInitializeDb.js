// Direct database initialization script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database paths
const localDbPath = path.join(__dirname, 'database.sqlite');
const appDataPath = path.join(__dirname, '..', 'data');
const productionDbPath = path.join(appDataPath, 'patients.sqlite');

async function initializeDatabase() {
  // First check if the production path exists
  let dbPath = productionDbPath;
  
  if (fs.existsSync(appDataPath)) {
    console.log(`Data directory exists at: ${appDataPath}`);
    
    if (fs.existsSync(productionDbPath)) {
      console.log(`Using production database at: ${productionDbPath}`);
      dbPath = productionDbPath;
    } else {
      console.log(`Production database not found, using local database at: ${localDbPath}`);
      dbPath = localDbPath;
    }
  } else {
    console.log(`Data directory does not exist, creating it...`);
    fs.mkdirSync(appDataPath, { recursive: true });
    console.log(`Using local database at: ${localDbPath}`);
    dbPath = localDbPath;
  }
  
  console.log(`Opening database at: ${dbPath}`);
  
  // Make sure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('Database connection established');
  
  try {
    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');
    
    // Create necessary tables
    console.log('Creating required tables...');
    
    // Create patients table if it doesn't exist
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
        mrn TEXT,
        medical_record_number TEXT,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create migrations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await db.exec('CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients (mrn)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_patients_medical_record_number ON patients (medical_record_number)');
    
    console.log('Database initialization completed successfully');
    
    // Close the connection
    await db.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    
    // Close the connection
    try {
      await db.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().then(() => {
  console.log('Database initialization completed.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in database initialization:', err);
  process.exit(1);
}); 