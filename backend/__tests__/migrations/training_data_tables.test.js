const db = require('../../db');
const { runMigrations } = require('../../utils/migration');

describe('Training Data Tables Migration', () => {
  beforeAll(async () => {
    // Run the migration
    await runMigrations();
  });

  afterAll(async () => {
    // Close the database connection
    await db.close();
  });

  it('should create the training_data table with correct schema', async () => {
    // Get table info
    const tableInfo = await db.all(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='training_data'
    `);
    
    expect(tableInfo.length).toBe(1);
    const createStatement = tableInfo[0].sql;
    
    // Check for required columns
    expect(createStatement).toContain('id INTEGER PRIMARY KEY');
    expect(createStatement).toContain('caution_card_id INTEGER NOT NULL');
    expect(createStatement).toContain('field_name TEXT NOT NULL');
    expect(createStatement).toContain('original_ocr_text TEXT');
    expect(createStatement).toContain('corrected_text TEXT');
    expect(createStatement).toContain('confidence_score REAL');
    expect(createStatement).toContain('user_id INTEGER');
    expect(createStatement).toContain('created_at TIMESTAMP');
    
    // Check for foreign key constraints
    expect(createStatement).toContain('FOREIGN KEY (caution_card_id) REFERENCES caution_cards(id)');
    expect(createStatement).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('should create the error_patterns table with correct schema', async () => {
    // Get table info
    const tableInfo = await db.all(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='error_patterns'
    `);
    
    expect(tableInfo.length).toBe(1);
    const createStatement = tableInfo[0].sql;
    
    // Check for required columns
    expect(createStatement).toContain('id INTEGER PRIMARY KEY');
    expect(createStatement).toContain('pattern_type TEXT NOT NULL');
    expect(createStatement).toContain('original_text TEXT');
    expect(createStatement).toContain('corrected_text TEXT');
    expect(createStatement).toContain('frequency INTEGER');
    expect(createStatement).toContain('created_at TIMESTAMP');
    expect(createStatement).toContain('updated_at TIMESTAMP');
  });

  it('should create the training_mode_settings table with correct schema', async () => {
    // Get table info
    const tableInfo = await db.all(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='training_mode_settings'
    `);
    
    expect(tableInfo.length).toBe(1);
    const createStatement = tableInfo[0].sql;
    
    // Check for required columns
    expect(createStatement).toContain('id INTEGER PRIMARY KEY');
    expect(createStatement).toContain('user_id INTEGER');
    expect(createStatement).toContain('is_training_mode BOOLEAN');
    expect(createStatement).toContain('last_updated TIMESTAMP');
    
    // Check for foreign key constraint
    expect(createStatement).toContain('FOREIGN KEY (user_id) REFERENCES users(id)');
  });

  it('should allow inserting and retrieving training data', async () => {
    // Insert test data
    await db.run(`
      INSERT INTO training_data 
      (caution_card_id, field_name, original_ocr_text, corrected_text, confidence_score, user_id)
      VALUES (1, 'patient_name', 'John Doe', 'John Smith', 0.85, 1)
    `);
    
    // Retrieve the data
    const result = await db.get(`
      SELECT * FROM training_data WHERE caution_card_id = 1 AND field_name = 'patient_name'
    `);
    
    expect(result).toBeTruthy();
    expect(result.original_ocr_text).toBe('John Doe');
    expect(result.corrected_text).toBe('John Smith');
    expect(result.confidence_score).toBe(0.85);
  });

  it('should allow inserting and retrieving error patterns', async () => {
    // Insert test data
    await db.run(`
      INSERT INTO error_patterns 
      (pattern_type, original_text, corrected_text, frequency)
      VALUES ('patient_name', 'John Doe', 'John Smith', 1)
    `);
    
    // Retrieve the data
    const result = await db.get(`
      SELECT * FROM error_patterns WHERE pattern_type = 'patient_name' AND original_text = 'John Doe'
    `);
    
    expect(result).toBeTruthy();
    expect(result.corrected_text).toBe('John Smith');
    expect(result.frequency).toBe(1);
  });

  it('should allow inserting and retrieving training mode settings', async () => {
    // Insert test data
    await db.run(`
      INSERT INTO training_mode_settings 
      (user_id, is_training_mode)
      VALUES (1, 1)
    `);
    
    // Retrieve the data
    const result = await db.get(`
      SELECT * FROM training_mode_settings WHERE user_id = 1
    `);
    
    expect(result).toBeTruthy();
    expect(result.is_training_mode).toBe(1);
  });
}); 