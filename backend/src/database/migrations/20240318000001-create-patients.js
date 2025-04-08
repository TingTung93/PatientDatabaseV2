'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Patients', { // Assuming model name is Patient -> table Patients
      id: {
        // Using UUID based on CautionCard model, adjust if Patient model uses INTEGER
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      medical_record_number: {
        type: Sequelize.STRING(50),
        allowNull: true, // Allow null? Original SQL was UNIQUE
        unique: true
      },
      dob: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      gender: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'Other'
      },
      contact_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      blood_type: {
        // Using ENUM based on CHECK constraint, adjust if model differs
        type: Sequelize.ENUM('A POS', 'A NEG', 'B POS', 'B NEG', 'AB POS', 'AB NEG', 'O POS', 'O NEG'),
        allowNull: true
      },
      medical_history: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      allergies: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      current_medications: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Adding fields from addReportFieldsToPatients migration directly
      abo_rh: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      phenotype: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      transfusion_requirements: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      antibodies: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      antigens: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      // Assuming paranoid: true (soft deletes) based on config.js
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });
    // Add indexes
    await queryInterface.addIndex('Patients', ['medical_record_number'], { unique: true });
    await queryInterface.addIndex('Patients', ['first_name', 'last_name']);
    await queryInterface.addIndex('Patients', ['dob']);
    await queryInterface.addIndex('Patients', ['abo_rh']); // From addReportFields migration
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Patients');
  }
};