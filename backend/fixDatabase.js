// Direct database fixer script
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all database paths to fix
const localDbPath = path.join(__dirname, 'database.sqlite');
const appDataPath = path.join(__dirname, '..', 'data');
const productionDbPath = path.join(appDataPath, 'patients.sqlite');

async function fixDatabase() {
  console.log(`Opening local database at: ${localDbPath}`);
  
  // Ensure data directory exists
  if (!fs.existsSync(appDataPath)) {
    console.log(`Creating data directory: ${appDataPath}`);
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  // Fix both database files
  await fixDatabaseFile(localDbPath);
  console.log('---');
  await fixDatabaseFile(productionDbPath);
  
  console.log('All database fixes completed successfully');
}

// Extract the database fixing logic to a separate function to reuse for both files
async function fixDatabaseFile(dbPath) {
  console.log(`Fixing database at: ${dbPath}`);
  
  // Open database connection
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('Database connection established');
  
  try {
    // Start transaction
    await db.exec('BEGIN TRANSACTION');
    
    // Step 1: Check if caution_cards table exists
    const cautionCardsExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='caution_cards'`
    );
    
    if (cautionCardsExists) {
      console.log('caution_cards table exists, checking for blood_type column');
      
      // Check if blood_type column exists
      const columnInfo = await db.all('PRAGMA table_info(caution_cards)');
      const hasBloodType = columnInfo.some(col => col.name === 'blood_type');
      
      if (!hasBloodType) {
        console.log('Adding blood_type column to caution_cards table');
        await db.exec('ALTER TABLE caution_cards ADD COLUMN blood_type TEXT');
      } else {
        console.log('blood_type column already exists in caution_cards table');
      }
      
      // Check if image_path column exists
      const hasImagePath = columnInfo.some(col => col.name === 'image_path');
      
      if (!hasImagePath) {
        console.log('Adding image_path column to caution_cards table');
        await db.exec('ALTER TABLE caution_cards ADD COLUMN image_path TEXT');
      }
    } else {
      console.log('caution_cards table does not exist');
    }
    
    // Step 2: Check if patients table exists
    const patientsExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='patients'`
    );
    
    if (patientsExists) {
      console.log('patients table exists, checking for columns');
      
      // Check columns
      const patientColumns = await db.all('PRAGMA table_info(patients)');
      
      // Check medical_record_number column
      const hasMedicalRecordNumber = patientColumns.some(col => col.name === 'medical_record_number');
      
      if (!hasMedicalRecordNumber) {
        console.log('Adding medical_record_number column to patients table');
        await db.exec('ALTER TABLE patients ADD COLUMN medical_record_number TEXT');
        
        // If mrn column exists, copy data from mrn to medical_record_number
        const hasMrn = patientColumns.some(col => col.name === 'mrn');
        if (hasMrn) {
          console.log('Copying data from mrn to medical_record_number');
          await db.exec('UPDATE patients SET medical_record_number = mrn WHERE mrn IS NOT NULL');
        }
      }
      
      // Check metadata column
      const hasMetadata = patientColumns.some(col => col.name === 'metadata');
      
      if (!hasMetadata) {
        console.log('Adding metadata column to patients table');
        await db.exec('ALTER TABLE patients ADD COLUMN metadata TEXT');
      }
      
      // Check date_of_birth
      const hasDateOfBirth = patientColumns.some(col => col.name === 'date_of_birth');
      const hasDob = patientColumns.some(col => col.name === 'dob');
      
      if (!hasDateOfBirth && hasDob) {
        console.log('Adding date_of_birth column and copying from dob');
        await db.exec('ALTER TABLE patients ADD COLUMN date_of_birth TEXT');
        await db.exec('UPDATE patients SET date_of_birth = dob WHERE dob IS NOT NULL');
      }
    } else {
      console.log('patients table does not exist, creating it');
      
      // Create patients table with all required columns
      await db.exec(`
        CREATE TABLE patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          date_of_birth TEXT,
          dob TEXT,
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
      
      console.log('Created patients table');
      
      // Create indexes for faster lookups
      await db.exec('CREATE INDEX idx_patients_mrn ON patients (mrn)');
      await db.exec('CREATE INDEX idx_patients_medical_record_number ON patients (medical_record_number)');
      
      console.log('Created indexes on patients table');
    }
    
    // Step 3: Create or check patient_reports table
    const patientReportsExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='patient_reports'`
    );
    
    if (!patientReportsExists) {
      console.log('Creating patient_reports table');
      await db.exec(`
        CREATE TABLE patient_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          report_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients (id),
          FOREIGN KEY (report_id) REFERENCES raw_reports (id),
          UNIQUE(patient_id, report_id)
        )
      `);
      
      // Add indexes
      await db.exec('CREATE INDEX idx_patient_reports_patient_id ON patient_reports (patient_id)');
      await db.exec('CREATE INDEX idx_patient_reports_report_id ON patient_reports (report_id)');
    } else {
      console.log('patient_reports table already exists');
    }
    
    // Step 4: Create or update indexes
    console.log('Creating/updating indexes');
    
    if (patientsExists) {
      // Create index on medical_record_number
      await db.exec('CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients (medical_record_number)');
    }
    
    // Commit all changes
    await db.exec('COMMIT');
    console.log(`Database fixes applied successfully for ${dbPath}`);
    
  } catch (error) {
    // Rollback on error
    await db.exec('ROLLBACK');
    console.error(`Error fixing database ${dbPath}:`, error);
    throw error;
  } finally {
    // Close database connection
    await db.close();
    console.log('Database connection closed');
  }
}

// Run the fix
fixDatabase().then(() => {
  console.log('Database fix process completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in database fix process:', err);
  process.exit(1);
}); 