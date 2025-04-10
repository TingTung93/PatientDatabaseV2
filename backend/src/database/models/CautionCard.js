'use strict';
import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class CautionCard extends Model {
    static associate(models) {
      // Define associations
      CautionCard.belongsTo(models.Patient, {
        foreignKey: 'linkedPatientId',
        as: 'linkedPatient',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // Association to orphaned card record
      CautionCard.hasOne(models.OrphanedCautionCard, {
        foreignKey: 'originalCardId',
        as: 'orphanedCard',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
  }
  CautionCard.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    originalFilePath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Path to the original uploaded file (image/pdf)',
    },
    status: {
      type: DataTypes.ENUM('processing_ocr', 'pending_review', 'linked', 'orphaned'),
      defaultValue: 'processing_ocr',
      allowNull: false,
      comment: 'Current status of the caution card processing',
    },
    ocrResults: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Raw OCR extraction results',
    },
    reviewedData: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidReviewedData(value) {
          if (value && !value.patientName) {
            throw new Error('Patient name is required in reviewedData when provided');
          }
        }
      },
      comment: 'User-reviewed and potentially corrected data',
    },
    linkedPatientId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isValidLink(value) {
          if (this.status === 'linked' && !value) {
            throw new Error('linkedPatientId is required when status is linked');
          }
          if (this.status !== 'linked' && value) {
            throw new Error('linkedPatientId should only be set when status is linked');
          }
        }
      },
      references: {
        model: 'Patients',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID of the patient this card is linked to',
    },
    // Timestamps
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'CautionCard',
    tableName: 'CautionCards', // Explicit table name
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['linkedPatientId']
      }
    ],
    hooks: {
      beforeSave: async (instance) => {
        // Validate status transitions
        if (instance.changed('status')) {
          const validTransitions = {
            processing_ocr: ['pending_review'],
            pending_review: ['linked', 'orphaned'],
            linked: [],
            orphaned: []
          };

          const oldStatus = instance.previous('status');
          const newStatus = instance.status;

          if (oldStatus && !validTransitions[oldStatus].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
          }
        }
      }
    }
  });
  return CautionCard;
};