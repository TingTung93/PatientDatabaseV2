// Script to directly fix the patient report mapping in the database
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path
const dbPath = path.join(__dirname, 'database.sqlite');

async function fixPatientReportMapping() {
  console.log(`Opening database at: ${dbPath}`);
  
  // Open database connection
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('Database connection established');
  
  try {
    // Start transaction
    await db.exec('BEGIN TRANSACTION');
    
    // Check if raw_reports table exists
    const rawReportsExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='raw_reports'`
    );
    
    if (!rawReportsExists) {
      console.log('raw_reports table does not exist, creating it...');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS raw_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT,
          metadata TEXT,
          patients TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('raw_reports table created');
      
      // No reports to process yet
      console.log('No reports to process since table was just created');
      await db.exec('COMMIT');
      return;
    }
    
    // 1. Get all reports that have patients in JSON format
    console.log('Looking for reports with patients...');
    const reports = await db.all(`
      SELECT id, patients FROM raw_reports 
      WHERE patients IS NOT NULL AND patients != '[]'
    `);
    
    console.log(`Found ${reports.length} reports with patient data`);
    
    // Process each report
    for (const report of reports) {
      try {
        console.log(`Processing report ${report.id}...`);
        const patients = JSON.parse(report.patients);
        
        if (!Array.isArray(patients) || patients.length === 0) {
          console.log(`Report ${report.id} has no valid patients data, skipping`);
          continue;
        }
        
        console.log(`Report ${report.id} has ${patients.length} patients`);
        
        // Process each patient in the report
        for (const patient of patients) {
          // Skip if no medical record number
          if (!patient.medicalRecordNumber) {
            console.log('Patient has no medical record number, skipping');
            continue;
          }
          
          // Check if patient exists by medical record number
          let existingPatient = await db.get(
            'SELECT * FROM patients WHERE medical_record_number = ?', 
            patient.medicalRecordNumber
          );
          
          let patientId;
          
          if (existingPatient) {
            console.log(`Found existing patient with MRN ${patient.medicalRecordNumber}, updating...`);
            
            // Update existing patient with any new info
            await db.run(`
              UPDATE patients SET
              first_name = COALESCE(?, first_name),
              last_name = COALESCE(?, last_name),
              date_of_birth = COALESCE(?, date_of_birth),
              blood_type = COALESCE(?, blood_type),
              metadata = ?,
              updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [
              patient.firstName || null,
              patient.lastName || null,
              patient.dateOfBirth instanceof Date ? 
                patient.dateOfBirth.toISOString().split('T')[0] : null,
              patient.bloodType || null,
              JSON.stringify({
                phenotype: patient.phenotype || 'Unknown',
                transfusionRequirements: patient.transfusionRequirements || [],
                antibodies: patient.antibodies || [],
                antigens: patient.antigens || [],
                comments: patient.comments || []
              }),
              existingPatient.id
            ]);
            
            patientId = existingPatient.id;
          } else {
            console.log(`Creating new patient with MRN ${patient.medicalRecordNumber}...`);
            
            // Insert new patient
            const result = await db.run(`
              INSERT INTO patients (
                first_name, last_name, medical_record_number, date_of_birth,
                blood_type, metadata, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              patient.firstName || '',
              patient.lastName || '',
              patient.medicalRecordNumber,
              patient.dateOfBirth instanceof Date ? 
                patient.dateOfBirth.toISOString().split('T')[0] : null,
              patient.bloodType || null,
              JSON.stringify({
                phenotype: patient.phenotype || 'Unknown',
                transfusionRequirements: patient.transfusionRequirements || [],
                antibodies: patient.antibodies || [],
                antigens: patient.antigens || [],
                comments: patient.comments || []
              })
            ]);
            
            patientId = result.lastID;
          }
          
          // Check if the patient_reports table exists
          const patientReportsExists = await db.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='patient_reports'`
          );
          
          if (!patientReportsExists) {
            console.log('Creating patient_reports table...');
            await db.exec(`
              CREATE TABLE IF NOT EXISTS patient_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                report_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients (id),
                FOREIGN KEY (report_id) REFERENCES raw_reports (id),
                UNIQUE(patient_id, report_id)
              )
            `);
            
            await db.exec(`
              CREATE INDEX IF NOT EXISTS idx_patient_reports_patient_id ON patient_reports (patient_id);
              CREATE INDEX IF NOT EXISTS idx_patient_reports_report_id ON patient_reports (report_id);
            `);
          }
          
          // Link patient to report
          console.log(`Linking patient ${patientId} to report ${report.id}...`);
          await db.run(`
            INSERT OR IGNORE INTO patient_reports (
              patient_id, report_id, created_at
            ) VALUES (?, ?, CURRENT_TIMESTAMP)
          `, [patientId, report.id]);
        }
        
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        // Continue to the next report
      }
    }
    
    // Commit all changes
    await db.exec('COMMIT');
    console.log('Patient report mappings applied successfully');
    
  } catch (error) {
    // Rollback on error
    await db.exec('ROLLBACK');
    console.error('Error fixing patient report mappings:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.close();
    console.log('Database connection closed');
  }
}

// Run the fix
fixPatientReportMapping().then(() => {
  console.log('Patient report mapping process completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error in patient report mapping process:', err);
  process.exit(1);
}); 