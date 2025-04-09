const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

const Report = sequelize.define('Report', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    facilityId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d{4}-[A-Z]{2}$/
        }
    },
    facility: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^\d{4}[A-Z]$/
        }
    },
    reportDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    uploadedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    processingStatus: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'error'),
        defaultValue: 'pending'
    },
    processingErrors: {
        type: DataTypes.JSON,
        allowNull: true
    },
    originalFilename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileChecksum: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    indexes: [
        {
            fields: ['facilityId']
        },
        {
            fields: ['reportDate']
        },
        {
            fields: ['processingStatus']
        }
    ]
});

module.exports = Report; 