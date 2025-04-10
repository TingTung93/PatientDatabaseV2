import { db, closeDb } from './init.js';

/**
 * Seed the database with test data
 */
function seed() {
  console.log('Starting database seed...');

  try {
    // Create tables if they don't exist
    createTables();
    
    // Clean existing data
    cleanTables();
    
    // Seed patients
    seedPatients();
    
    // Seed reports
    seedReports();
    
    // Seed caution cards
    seedCautionCards();
    
    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Close database connection
    closeDb();
  }
}

/**
 * Create database tables if they don't exist
 */
function createTables() {
  console.log('Creating tables if needed...');
  
  // Create patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      blood_type TEXT,
      contact_number TEXT,
      email TEXT,
      address TEXT,
      medical_record_number TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      patient_id INTEGER,
      ocr_text TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id)
    )
  `);
  
  // Create report_attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports (id)
    )
  `);
  
  // Create caution_cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS caution_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      patient_id INTEGER,
      blood_type TEXT,
      antibodies TEXT,
      transfusion_requirements TEXT,
      ocr_text TEXT,
      metadata TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_date TIMESTAMP,
      reviewed_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients (id)
    )
  `);
}

/**
 * Clean existing data from tables
 */
function cleanTables() {
  console.log('Cleaning existing data...');
  
  try {
    // Using explicit transaction for cleaning
    db.exec('BEGIN TRANSACTION');
    
    // Delete data from tables in the correct order (respecting foreign keys)
    db.exec('DELETE FROM report_attachments');
    db.exec('DELETE FROM reports');
    db.exec('DELETE FROM caution_cards');
    db.exec('DELETE FROM patients');
    
    // Reset autoincrement counters with proper quotes
    db.exec("DELETE FROM sqlite_sequence WHERE name='patients'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='reports'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='caution_cards'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='report_attachments'");
    
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error cleaning tables:', error);
    throw error;
  }
}

/**
 * Seed patients table with test data
 */
function seedPatients() {
  console.log('Seeding patients...');
  
  const patients = [
    {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1980-05-15',
      gender: 'Male',
      blood_type: 'A+',
      contact_number: '555-123-4567',
      email: 'john.doe@example.com',
      address: '123 Main St, Anytown, USA',
      medical_record_number: 'MRN12345',
      notes: 'Regular checkups every 6 months.'
    },
    {
      first_name: 'Jane',
      last_name: 'Smith',
      date_of_birth: '1975-08-22',
      gender: 'Female',
      blood_type: 'O-',
      contact_number: '555-987-6543',
      email: 'jane.smith@example.com',
      address: '456 Oak Ave, Somewhere, USA',
      medical_record_number: 'MRN67890',
      notes: 'Allergic to penicillin.'
    },
    {
      first_name: 'Michael',
      last_name: 'Johnson',
      date_of_birth: '1990-12-10',
      gender: 'Male',
      blood_type: 'AB+',
      contact_number: '555-456-7890',
      email: 'michael.johnson@example.com',
      address: '789 Pine St, Elsewhere, USA',
      medical_record_number: 'MRN24680',
      notes: 'History of hypertension.'
    }
  ];
  
  const insert = db.prepare(`
    INSERT INTO patients (
      first_name, last_name, date_of_birth, gender, blood_type,
      contact_number, email, address, medical_record_number, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const patient of patients) {
    insert.run(
      patient.first_name,
      patient.last_name,
      patient.date_of_birth,
      patient.gender,
      patient.blood_type,
      patient.contact_number,
      patient.email,
      patient.address,
      patient.medical_record_number,
      patient.notes
    );
  }
  
  console.log(`Seeded ${patients.length} patients`);
}

/**
 * Seed reports table with test data
 */
function seedReports() {
  console.log('Seeding reports...');
  
  const reports = [
    {
      type: 'blood',
      file_name: 'blood_test_john.pdf',
      file_path: 'uploads/reports/blood_test_john.pdf',
      file_size: 1024 * 100, // 100KB
      file_type: 'application/pdf',
      patient_id: 1,
      ocr_text: 'Blood test results for John Doe. Hemoglobin: 14.5 g/dL, White Blood Cell Count: 7.5k/μL, Platelet Count: 250k/μL.',
      metadata: JSON.stringify({
        doctor: 'Dr. Smith',
        hospital: 'General Hospital',
        date: '2023-03-15'
      }),
      status: 'completed'
    },
    {
      type: 'mri',
      file_name: 'mri_scan_jane.pdf',
      file_path: 'uploads/reports/mri_scan_jane.pdf',
      file_size: 1024 * 500, // 500KB
      file_type: 'application/pdf',
      patient_id: 2,
      ocr_text: 'MRI scan report for Jane Smith. No abnormalities detected in the brain.',
      metadata: JSON.stringify({
        doctor: 'Dr. Johnson',
        hospital: 'Medical Center',
        date: '2023-04-22'
      }),
      status: 'completed'
    },
    {
      type: 'lab',
      file_name: 'lab_results_michael.pdf',
      file_path: 'uploads/reports/lab_results_michael.pdf',
      file_size: 1024 * 200, // 200KB
      file_type: 'application/pdf',
      patient_id: 3,
      ocr_text: 'Laboratory results for Michael Johnson. Cholesterol: 185 mg/dL, Glucose: 95 mg/dL.',
      metadata: JSON.stringify({
        doctor: 'Dr. Williams',
        laboratory: 'Central Lab',
        date: '2023-05-10'
      }),
      status: 'completed'
    },
    {
      type: 'xray',
      file_name: 'chest_xray.pdf',
      file_path: 'uploads/reports/chest_xray.pdf',
      file_size: 1024 * 300, // 300KB
      file_type: 'application/pdf',
      patient_id: null, // Unlinked report
      ocr_text: 'Chest X-ray shows clear lungs with no signs of infection or abnormalities.',
      metadata: JSON.stringify({
        doctor: 'Dr. Brown',
        hospital: 'Community Hospital',
        date: '2023-06-05'
      }),
      status: 'pending'
    }
  ];
  
  const insert = db.prepare(`
    INSERT INTO reports (
      type, file_name, file_path, file_size, file_type,
      patient_id, ocr_text, metadata, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const report of reports) {
    insert.run(
      report.type,
      report.file_name,
      report.file_path,
      report.file_size,
      report.file_type,
      report.patient_id,
      report.ocr_text,
      report.metadata,
      report.status
    );
  }
  
  console.log(`Seeded ${reports.length} reports`);
}

/**
 * Seed caution cards table with test data
 */
function seedCautionCards() {
  console.log('Seeding caution cards...');
  
  const cautionCards = [
    {
      file_name: 'caution_card_john.pdf',
      file_path: 'uploads/caution-cards/caution_card_john.pdf',
      file_size: 1024 * 150, // 150KB
      file_type: 'application/pdf',
      patient_id: 1,
      blood_type: 'A+',
      antibodies: JSON.stringify(['Anti-K']),
      transfusion_requirements: JSON.stringify(['Leukocyte-reduced']),
      ocr_text: 'Patient: John Doe, Blood Type: A+, Antibodies: Anti-K, Transfusion Requirements: Leukocyte-reduced components only.',
      metadata: JSON.stringify({
        issuer: 'Blood Bank Center',
        date: '2023-02-10'
      }),
      status: 'reviewed',
      reviewed_date: '2023-02-12',
      reviewed_by: 'Dr. Martinez',
      updated_by: 'system'
    },
    {
      file_name: 'caution_card_jane.pdf',
      file_path: 'uploads/caution-cards/caution_card_jane.pdf',
      file_size: 1024 * 120, // 120KB
      file_type: 'application/pdf',
      patient_id: 2,
      blood_type: 'O-',
      antibodies: JSON.stringify(['Anti-D', 'Anti-C']),
      transfusion_requirements: JSON.stringify(['Irradiated', 'Washed']),
      ocr_text: 'Patient: Jane Smith, Blood Type: O-, Antibodies: Anti-D, Anti-C, Transfusion Requirements: Irradiated and washed components.',
      metadata: JSON.stringify({
        issuer: 'Regional Blood Center',
        date: '2023-01-15'
      }),
      status: 'reviewed',
      reviewed_date: '2023-01-17',
      reviewed_by: 'Dr. Garcia',
      updated_by: 'system'
    },
    {
      file_name: 'caution_card_unlinked.pdf',
      file_path: 'uploads/caution-cards/caution_card_unlinked.pdf',
      file_size: 1024 * 130, // 130KB
      file_type: 'application/pdf',
      patient_id: null, // Unlinked card
      blood_type: 'B+',
      antibodies: JSON.stringify(['Anti-E']),
      transfusion_requirements: JSON.stringify(['CMV-negative']),
      ocr_text: 'Blood Type: B+, Antibodies: Anti-E, Transfusion Requirements: CMV-negative components only.',
      metadata: JSON.stringify({
        issuer: 'University Hospital Blood Bank',
        date: '2023-06-01'
      }),
      status: 'pending',
      reviewed_date: null,
      reviewed_by: null,
      updated_by: 'system'
    }
  ];
  
  const insert = db.prepare(`
    INSERT INTO caution_cards (
      file_name, file_path, file_size, file_type, patient_id,
      blood_type, antibodies, transfusion_requirements, ocr_text,
      metadata, status, reviewed_date, reviewed_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const card of cautionCards) {
    insert.run(
      card.file_name,
      card.file_path,
      card.file_size,
      card.file_type,
      card.patient_id,
      card.blood_type,
      card.antibodies,
      card.transfusion_requirements,
      card.ocr_text,
      card.metadata,
      card.status,
      card.reviewed_date,
      card.reviewed_by,
      card.updated_by
    );
  }
  
  console.log(`Seeded ${cautionCards.length} caution cards`);
}

// Run the seed function
seed(); 