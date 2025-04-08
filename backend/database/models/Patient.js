const { DataTypes } = require('sequelize');

const sequelize = require('../connection');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  mrn: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Medical Record Number'
  },
  
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Patient full name'
  },
  
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Patient date of birth'
  },

  gender: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['M', 'F', 'O']]
    }
  },

  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'patients',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['mrn']
    }
  ],
  comment: 'Stores patient information'
});

// Define model associations
Patient.associate = (models) => {
  Patient.hasMany(models.OcrResult, {
    foreignKey: 'patientId',
    as: 'ocrResults'
  });
};

module.exports = Patient;