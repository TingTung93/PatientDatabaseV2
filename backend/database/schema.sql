-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create an index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Patients table for core patient information
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    antigen_phenotype TEXT,
    transfusion_restrictions TEXT,
    antibodies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by INTEGER,
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

-- Patient sources table to track different data sources for each patient
DROP TABLE IF EXISTS patient_sources;
CREATE TABLE IF NOT EXISTS patient_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'report', 'merged')),
    source_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Review queue table for pending changes
CREATE TABLE IF NOT EXISTS review_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'report', 'merged')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    data JSON NOT NULL,
    submitted_by INTEGER NOT NULL,
    reviewed_by INTEGER,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Patient history table for audit trail
CREATE TABLE IF NOT EXISTS patient_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'merged', 'deleted')),
    changes JSON NOT NULL,
    performed_by INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'report', 'merged', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- File attachments table for storing OCR source files
CREATE TABLE IF NOT EXISTS file_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    review_queue_id INTEGER,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'text')),
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_data BLOB NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (review_queue_id) REFERENCES review_queue(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_blood_type ON patients(blood_type);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_updated_at ON patients(updated_at);
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_patients_name_dob ON patients(name, date_of_birth);
CREATE INDEX IF NOT EXISTS idx_patients_blood_restrictions ON patients(blood_type, transfusion_restrictions);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_patient_history_patient_id ON patient_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_sources_patient_id ON patient_sources(patient_id);

-- Transfusion requirements table
CREATE TABLE IF NOT EXISTS transfusion_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    blood_component TEXT NOT NULL CHECK (blood_component IN ('RBC', 'Platelets', 'Plasma', 'Cryo')),
    quantity_units TEXT NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by INTEGER NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transfusion_requirements_patient_id ON transfusion_requirements(patient_id);
CREATE INDEX IF NOT EXISTS idx_transfusion_requirements_blood_component ON transfusion_requirements(blood_component);

-- Reports table for storing uploaded report files and extracted data
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- Type of report (e.g., 'lab_result', 'imaging', 'consultation')
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE, -- Store the path to the file on disk
    file_type TEXT NOT NULL, -- MIME type of the file
    extracted_data TEXT, -- Store extracted text or structured data (e.g., JSON) from the report
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Indexes for reports table
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);

-- End of schema definition