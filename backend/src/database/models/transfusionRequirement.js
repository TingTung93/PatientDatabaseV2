const { DataTypes } = require('sequelize')

module.exports = (sequelize, Sequelize) => {
    const TransfusionRequirement = sequelize.define('TransfusionRequirement', {
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
        blood_type_required: {
            type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
            allowNull: false
        },
        units_required: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1
            }
        },
        urgency_level: {
            type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
            allowNull: false
        },
        required_by_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Pending', 'In Progress', 'Completed'),
            defaultValue: 'Pending'
        },
        notes: {
            type: DataTypes.TEXT
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }, {
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['patient_id']
            },
            {
                fields: ['required_by_date']
            }
        ]
    })

    return TransfusionRequirement
}