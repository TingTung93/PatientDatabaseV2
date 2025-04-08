'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OrphanedCautionCards', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      originalCardId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'CautionCards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',  // If original card is deleted, keep orphan record but null the reference
        comment: 'ID of the original entry in CautionCards table',
      },
      originalFilePath: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Path to the original uploaded file',
      },
      ocrResults: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Raw OCR extraction results',
      },
      reviewedData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'User-reviewed data at the time of marking as orphan',
      },
      markedOrphanAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when the card was marked as orphan',
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
    // Add unique index on originalCardId to ensure only one orphan record per original card
    await queryInterface.addIndex('OrphanedCautionCards', ['originalCardId'], {
      unique: true,
      name: 'orphaned_cards_original_card_id_unique'
    });

    // Add index on markedOrphanAt for chronological queries
    await queryInterface.addIndex('OrphanedCautionCards', ['markedOrphanAt'], {
      name: 'orphaned_cards_marked_orphan_at_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OrphanedCautionCards');
  }
};