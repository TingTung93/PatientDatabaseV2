const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
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
        fields: ['type']
      },
      {
        fields: ['date']
      },
      {
        fields: ['created_by']
      }
    ]
  });

  return Report;
}; 