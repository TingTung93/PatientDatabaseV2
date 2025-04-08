'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new status values to the enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_CautionCards_status" ADD VALUE IF NOT EXISTS 'processing_ocr';
      ALTER TYPE "enum_CautionCards_status" ADD VALUE IF NOT EXISTS 'pending_review';
      ALTER TYPE "enum_CautionCards_status" ADD VALUE IF NOT EXISTS 'linked';
      ALTER TYPE "enum_CautionCards_status" ADD VALUE IF NOT EXISTS 'orphaned';
    `);

    // Add new columns
    await queryInterface.addColumn('CautionCards', 'ocrResults', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    await queryInterface.addColumn('CautionCards', 'reviewedData', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    await queryInterface.addColumn('CautionCards', 'linkedPatientId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Patients',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add indexes for performance
    await queryInterface.addIndex('CautionCards', ['status']);
    await queryInterface.addIndex('CautionCards', ['linkedPatientId']);
    // Add GIN index for JSONB search
    await queryInterface.sequelize.query(
      'CREATE INDEX caution_cards_reviewed_data_gin_idx ON "CautionCards" USING gin (("reviewedData"::jsonb))'
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('CautionCards', 'caution_cards_reviewed_data_gin_idx');
    await queryInterface.removeIndex('CautionCards', ['status']);
    await queryInterface.removeIndex('CautionCards', ['linkedPatientId']);

    // Remove columns
    await queryInterface.removeColumn('CautionCards', 'linkedPatientId');
    await queryInterface.removeColumn('CautionCards', 'reviewedData');
    await queryInterface.removeColumn('CautionCards', 'ocrResults');

    // Note: Cannot remove enum values in PostgreSQL, but they won't affect functionality
  }
}; 