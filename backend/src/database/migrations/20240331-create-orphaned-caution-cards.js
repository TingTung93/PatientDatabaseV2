'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('OrphanedCautionCards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      originalFilePath: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ocrResults: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      reviewedData: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending_review', 'orphaned'),
        defaultValue: 'pending_review',
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('OrphanedCautionCards', ['status']);
    await queryInterface.addIndex('OrphanedCautionCards', ['createdAt']);
    // Add GIN index for JSONB search
    await queryInterface.sequelize.query(
      'CREATE INDEX orphaned_cards_reviewed_data_gin_idx ON "OrphanedCautionCards" USING gin (("reviewedData"::jsonb))'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('OrphanedCautionCards');
  }
}; 