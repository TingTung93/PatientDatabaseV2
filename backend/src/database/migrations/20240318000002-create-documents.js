'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Documents', { // Assuming model name is Document -> table Documents
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID, // Match Patient ID type if using UUID
        defaultValue: Sequelize.UUIDV4,
      },
      patient_id: {
        type: Sequelize.UUID, // Match Patient ID type
        allowNull: true, // Allow docs not linked to patients?
        references: { model: 'Patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      document_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      filename: { // Stored filename (e.g., UUID.pdf)
        type: Sequelize.STRING,
        allowNull: false
      },
      original_filename: { // Original uploaded filename
        type: Sequelize.STRING,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      path: { // Path relative to storage root
        type: Sequelize.STRING,
        allowNull: false
      },
      status: { // Status of document processing (if any)
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'uploaded' // Example status
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
    await queryInterface.addIndex('Documents', ['patient_id']);
    await queryInterface.addIndex('Documents', ['document_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Documents');
  }
};