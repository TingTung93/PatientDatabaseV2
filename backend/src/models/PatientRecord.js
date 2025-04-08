const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const PatientRecord = sequelize.define('PatientRecord', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    reportId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Reports',
            key: 'id'
        }
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    medicalRecordNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d+$/
        }
    },
    dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: false
    },
    bloodType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['A POS', 'A NEG', 'B POS', 'B NEG', 'O POS', 'O NEG', 'AB POS', 'AB NEG', '<None>']]
        }
    },
    phenotype: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '<None>'
    },
    transfusionRequirements: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '<None>'
    },
    antibodies: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '<None>'
    },
    antigens: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '<None>'
    },
    comments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    processingStatus: {
        type: DataTypes.ENUM('pending', 'processed', 'error'),
        defaultValue: 'pending'
    },
    processingErrors: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['reportId']
        },
        {
            fields: ['medicalRecordNumber']
        },
        {
            fields: ['lastName', 'firstName']
        },
        {
            fields: ['dateOfBirth']
        },
        {
            fields: ['bloodType']
        }
    ]
});

module.exports = PatientRecord; 