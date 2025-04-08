const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Document = sequelize.define('Document', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        patient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Patients',
                key: 'id'
            }
        },
        filename: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        original_filename: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
            defaultValue: 'pending',
            allowNull: false
        },
        ocr_text: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ocr_data: {
            type: DataTypes.JSON,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {},
            allowNull: false
        },
        uploaded_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        processed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        error: {
            type: DataTypes.STRING,
            allowNull: true
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: true,
        paranoid: true,
        underscored: true,
        indexes: [
            {
                fields: ['patient_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['uploaded_by']
            },
            {
                fields: ['processed_by']
            }
        ]
    });

    return Document;
};