const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();

const config = require('../config/config');

// Get database path
const dbPath = config.SQLITE_PATH || path.join(__dirname, '../../database.sqlite');
console.log('SQLite database path:', dbPath);

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create or open the SQLite database
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('Failed to enable foreign keys:', err);
  } else {
    console.log('Foreign keys enabled');
  }
});

// Create a simple Users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `, function(err) {
    if (err) {
      console.error('Error creating User table:', err);
    } else {
      console.log('User table created successfully');
      
      // Create a default user for testing
      const salt = crypto.randomBytes(16).toString('hex');
      const password = 'admin123';
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      
      // First check if the user already exists
      db.get('SELECT id FROM User WHERE username = ?', ['admin'], function(err, row) {
        if (err) {
          console.error('Error checking for existing user:', err);
        } else if (!row) {
          // Add a default user
          db.run(`
            INSERT INTO User (username, password_hash, salt, email, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, ['admin', hash, salt, 'admin@example.com', 'admin'], function(err) {
            if (err) {
              console.error('Error creating default user:', err);
            } else {
              console.log('Default user created with ID:', this.lastID);
            }
          });
        } else {
          console.log('Default user already exists with ID:', row.id);
        }
      });
    }
  });
  
  // Create a simple Patients table
  db.run(`
    CREATE TABLE IF NOT EXISTS Patient (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      dateOfBirth TEXT NOT NULL,
      gender TEXT NOT NULL,
      medicalRecordNumber TEXT UNIQUE,
      bloodType TEXT,
      contactNumber TEXT,
      address TEXT,
      emergencyContact TEXT,
      medicalHistory TEXT,
      created_by INTEGER NOT NULL,
      updated_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES User(id),
      FOREIGN KEY (updated_by) REFERENCES User(id)
    )
  `, function(err) {
    if (err) {
      console.error('Error creating Patient table:', err);
    } else {
      console.log('Patient table created successfully');
      
      // Add some sample patients for testing
      db.get('SELECT id FROM User WHERE username = ?', ['admin'], function(err, user) {
        if (err || !user) {
          console.error('Error fetching admin user:', err);
        } else {
          // Only add sample data if the Patient table is empty
          db.get('SELECT COUNT(*) as count FROM Patient', function(err, result) {
            if (err) {
              console.error('Error checking Patient count:', err);
            } else if (result.count === 0) {
              const samplePatients = [
                {
                  firstName: 'John',
                  lastName: 'Doe',
                  dateOfBirth: '1980-01-15',
                  gender: 'Male',
                  medicalRecordNumber: 'MRN100001',
                  bloodType: 'A+',
                  contactNumber: '555-123-4567',
                  created_by: user.id,
                  updated_by: user.id
                },
                {
                  firstName: 'Jane',
                  lastName: 'Smith',
                  dateOfBirth: '1992-05-22',
                  gender: 'Female', 
                  medicalRecordNumber: 'MRN100002',
                  bloodType: 'O-',
                  contactNumber: '555-987-6543',
                  created_by: user.id,
                  updated_by: user.id
                }
              ];
              
              const stmt = db.prepare(`
                INSERT INTO Patient (
                  firstName, lastName, dateOfBirth, gender, 
                  medicalRecordNumber, bloodType, contactNumber, 
                  created_by, updated_by, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `);
              
              samplePatients.forEach(patient => {
                stmt.run(
                  patient.firstName, 
                  patient.lastName,
                  patient.dateOfBirth,
                  patient.gender,
                  patient.medicalRecordNumber,
                  patient.bloodType,
                  patient.contactNumber,
                  patient.created_by,
                  patient.updated_by,
                  function(err) {
                    if (err) {
                      console.error('Error inserting sample patient:', err);
                    } else {
                      console.log('Sample patient created with ID:', this.lastID);
                    }
                  }
                );
              });
              
              stmt.finalize();
            } else {
              console.log('Patient table already has data, skipping sample data insertion');
            }
          });
        }
      });
    }
  });
});

// Close the database connection
setTimeout(() => {
  db.close(err => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database initialization complete');
    }
  });
}, 3000); // Give some time for all operations to complete 