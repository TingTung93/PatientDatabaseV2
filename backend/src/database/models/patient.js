import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Patient extends Model {
    static associate(models) {
      Patient.hasMany(models.Report, { foreignKey: 'patient_id' });
      Patient.hasMany(models.CautionCard, { foreignKey: 'patient_id' });
    }
  }
  
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
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING
    },
    medical_record_number: {
      type: DataTypes.STRING,
      unique: true
    },
    contact_number: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    address: {
      type: DataTypes.TEXT
    },
    emergency_contact: {
      type: DataTypes.TEXT
    },
    blood_type: {
      type: DataTypes.STRING
    },
    allergies: {
      type: DataTypes.TEXT
    },
    medical_conditions: {
      type: DataTypes.TEXT
    },
    medications: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Patient',
    tableName: 'Patients',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['medical_record_number']
      }
    ]
  });
  
  return Patient;
};