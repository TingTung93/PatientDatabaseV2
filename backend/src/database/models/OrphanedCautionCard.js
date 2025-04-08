'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrphanedCautionCard extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // No associations needed for orphaned cards
    }
  }
  OrphanedCautionCard.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    originalFilePath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    ocrResults: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    reviewedData: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notNull: true,
        isValidReviewedData(value) {
          if (!value.patientName) {
            throw new Error('Patient name is required in reviewedData');
          }
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending_review', 'orphaned'),
      defaultValue: 'pending_review',
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'OrphanedCautionCard',
    tableName: 'OrphanedCautionCards', // Explicit table name
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });
  return OrphanedCautionCard;
};