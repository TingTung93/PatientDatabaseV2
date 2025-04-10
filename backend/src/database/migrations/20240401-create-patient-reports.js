'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
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
    
    // Add indexes for faster lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_patient_id ON patient_reports (patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_reports_report_id ON patient_reports (report_id);
    `);
    
    console.log('Created patient_reports table and indexes');
  },

  down: async function(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS patient_reports
    `);
  }
}; 