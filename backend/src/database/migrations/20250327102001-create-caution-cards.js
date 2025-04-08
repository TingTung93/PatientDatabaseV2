'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CautionCards', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      originalFilePath: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Path to the original uploaded file (image/pdf)',
      },
      status: {
        type: Sequelize.ENUM('processing_ocr', 'pending_review', 'linked', 'orphaned'),
        allowNull: false,
        defaultValue: 'processing_ocr',
        comment: 'Current status of the caution card processing',
      },
      ocrResults: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Raw OCR extraction results',
      },
      reviewedData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'User-reviewed and potentially corrected data',
      },
      linkedPatientId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Patients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID of the patient this card is linked to',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    // Add named index on status for faster querying
    await queryInterface.addIndex('CautionCards', ['status'], {
      name: 'caution_cards_status_idx',
      comment: 'Index for querying cards by their processing status'
    });

    // Add named index on linkedPatientId for faster lookups
    await queryInterface.addIndex('CautionCards', ['linkedPatientId'], {
      name: 'caution_cards_patient_id_idx',
      comment: 'Index for finding cards linked to specific patients'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CautionCards');
  }
};