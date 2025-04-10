'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    // Check if patients table exists
    const tableInfo = await queryInterface.sequelize.query(
      `PRAGMA table_info(patients);`
    );
    
    // Get all column names
    const columns = tableInfo[0].map(column => column.name);
    
    // Add the metadata column if it doesn't exist
    if (!columns.includes('metadata')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE patients ADD COLUMN metadata TEXT;`
      );
      console.log('Added metadata column to patients table');
    }
    
    // Add medical_record_number column if it doesn't exist
    if (!columns.includes('medical_record_number')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE patients ADD COLUMN medical_record_number TEXT;`
      );
      console.log('Added medical_record_number column to patients table');
    }
    
    // Make sure we have the right date format columns
    if (!columns.includes('date_of_birth') && columns.includes('dob')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE patients ADD COLUMN date_of_birth TEXT;`
      );
      await queryInterface.sequelize.query(
        `UPDATE patients SET date_of_birth = dob;`
      );
      console.log('Added date_of_birth column to patients table and copied data from dob');
    }
    
    // Add index on medical_record_number for faster lookups
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients (medical_record_number);`
    );
    console.log('Added index on medical_record_number');
  },

  down: async function(queryInterface, Sequelize) {
    // SQLite doesn't support dropping columns
    console.log('SQLite does not support dropping columns. No down migration performed.');
  }
}; 