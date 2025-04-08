const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  class Patient extends Model {}

  Patient.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    medical_record_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gender: {
      type: DataTypes.ENUM('M', 'F', 'O'),
      defaultValue: 'O',
      allowNull: false
    },
    contact_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    blood_type: {
      type: DataTypes.ENUM('A POS', 'A NEG', 'B POS', 'B NEG', 'AB POS', 'AB NEG', 'O POS', 'O NEG'),
      allowNull: false
    },
    antigen_phenotype: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transfusion_restrictions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    antibodies: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    medical_history: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    current_medications: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comments: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
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
    sequelize,
    modelName: 'Patient',
    tableName: 'Patients',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: ['medical_record_number']
      },
      {
        fields: ['first_name', 'last_name']
      },
      {
        fields: ['date_of_birth']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['updated_by']
      }
    ]
  });

  return Patient;
};