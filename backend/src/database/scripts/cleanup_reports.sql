-- Drop the reports table if it exists (no need to archive data since table appears empty/invalid)
DROP TABLE IF EXISTS reports;

-- Update references in patient_sources
UPDATE patient_sources 
SET source_type = 'caution_card' 
WHERE source_type = 'report';

-- Update references in review_queue
UPDATE review_queue 
SET source_type = 'caution_card' 
WHERE source_type = 'report';

-- Update references in patient_history
UPDATE patient_history 
SET source_type = 'manual' 
WHERE source_type = 'report';

-- Recreate patient_sources with updated constraints
CREATE TABLE patient_sources_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'merged')),
    source_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

INSERT INTO patient_sources_new 
SELECT * FROM patient_sources;

DROP TABLE patient_sources;
ALTER TABLE patient_sources_new RENAME TO patient_sources;

-- Recreate review_queue with updated constraints
CREATE TABLE review_queue_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'merged')),
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

INSERT INTO review_queue_new 
SELECT * FROM review_queue;

DROP TABLE review_queue;
ALTER TABLE review_queue_new RENAME TO review_queue;

-- Recreate patient_history with updated constraints
CREATE TABLE patient_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'merged', 'deleted', 'archived')),
    changes JSON NOT NULL,
    performed_by INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('caution_card', 'merged', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

INSERT INTO patient_history_new 
SELECT * FROM patient_history;

DROP TABLE patient_history;
ALTER TABLE patient_history_new RENAME TO patient_history;

-- Recreate indexes
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_patient_history_patient_id ON patient_history(patient_id);
CREATE INDEX idx_patient_sources_patient_id ON patient_sources(patient_id); 