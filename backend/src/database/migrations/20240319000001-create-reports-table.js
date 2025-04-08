'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reports', { // Use standard model name convention if possible
      id: {
        allowNull: false,
        autoIncrement: true, // Use autoIncrement for SQLite primary key
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: { // Keep underscored if models use it
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Patients', key: 'id' }, // Assuming Patients table exists
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Or SET NULL depending on desired behavior
      },
      document_id: { // Assuming a documents table/model exists
        type: Sequelize.INTEGER,
        allowNull: true, // Make nullable if a report doesn't always have a doc
        // references: { model: 'Documents', key: 'id' },
        // onUpdate: 'CASCADE',
        // onDelete: 'SET NULL',
      },
      report_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      report_date: {
        type: Sequelize.DATEONLY, // Use DATEONLY for dates without time
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'final', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      created_by: { // Assuming a users table/model exists
        type: Sequelize.INTEGER,
        allowNull: true, // Allow null if creator isn't always tracked
        // references: { model: 'Users', key: 'id' },
        // onUpdate: 'CASCADE',
        // onDelete: 'SET NULL',
      },
      updated_by: { // Assuming a users table/model exists
        type: Sequelize.INTEGER,
        allowNull: true,
         // references: { model: 'Users', key: 'id' },
        // onUpdate: 'CASCADE',
        // onDelete: 'SET NULL',
      },
      created_at: { // Use underscored names to match config
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: { // Use underscored names to match config
        allowNull: false,
        type: Sequelize.DATE
      },
      deleted_at: { // Use underscored names to match config
        allowNull: true,
        type: Sequelize.DATE
      }
    });

    // Add indexes using queryInterface
    await queryInterface.addIndex('Reports', ['patient_id']);
    await queryInterface.addIndex('Reports', ['document_id']);
    await queryInterface.addIndex('Reports', ['report_type']);
    await queryInterface.addIndex('Reports', ['report_date']);
    await queryInterface.addIndex('Reports', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reports');
  }
};