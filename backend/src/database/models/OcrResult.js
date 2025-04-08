const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  class OcrResult extends Model {}

  OcrResult.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Patients',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Path to the uploaded image'
    },
    
    rawText: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raw OCR text extracted from the image'
    },
    
    extractedData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Structured data extracted from OCR text'
    },
    
    confidence: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['low', 'medium', 'high']]
      },
      comment: 'Overall confidence level of OCR extraction'
    },
    
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time in milliseconds taken to process the image'
    },
    
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'processed',
      validate: {
        isIn: [['processing', 'processed', 'failed']]
      }
    },
    
    errorMessage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Error message if OCR processing failed'
    }
  }, {
    sequelize,
    modelName: 'OcrResult',
    tableName: 'OcrResults',
    timestamps: true
  });

  return OcrResult;
}; 