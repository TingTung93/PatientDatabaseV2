import { Sequelize, DataTypes, Model } from 'sequelize';
import PasswordResetModel from './PasswordReset.js';
import UserModel from './User.js'; // Import the new User model

// --- Define Model Classes ---
// We define the classes first, but don't initialize them yet.

class Patient extends Model {}
class Report extends Model {}
class CautionCard extends Model {}
class User extends Model {} // Define User class placeholder
let PasswordReset; // Will be initialized later

// --- Model Initializer Function ---
// This function will be called AFTER sequelize is initialized in server.js
const initializeModels = (sequelize) => {
  if (!sequelize) {
    throw new Error('Sequelize instance must be provided to initializeModels');
  }

  // Initialize models - IMPORTANT: Initialize User BEFORE PasswordReset
  const User = UserModel(sequelize); // Initialize User model
  const Patient = PatientModel(sequelize, DataTypes);
  const Report = ReportModel(sequelize, DataTypes);
  const CautionCard = CautionCardModel(sequelize, DataTypes);
  const PasswordReset = PasswordResetModel(sequelize, DataTypes);
  
  // --- Define Associations ---
  // Use the static associate method if defined in the models
  const models = { User, Patient, Report, CautionCard, PasswordReset };
  Object.values(models).forEach(model => {
    if (model.associate) {
      model.associate(models);
    }
  });
  
  // Define associations explicitly for models that don't use the static associate method
  // Patient <-> Report
  Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
  Report.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  // Patient <-> CautionCard
  Patient.hasMany(CautionCard, { foreignKey: 'patient_id', as: 'cautionCards' });
  CautionCard.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  
  // Note: User <-> PasswordReset association is handled by the static associate methods

  // Return the initialized models
  return models;
};

// --- Exports ---
// Export the classes themselves and the initializer function.
export {
    Patient, // Export the class definition
    Report,  // Export the class definition
    CautionCard, // Export the class definition
    User, // Export the class definition
    PasswordReset, // Export the placeholder 
    initializeModels
};

// Helper functions to wrap existing .init calls if models weren't defined via factory functions initially
// (You might need to adjust these if your existing models weren't factory functions)
const PatientModel = (sequelize, DataTypes) => {
  Patient.init({ /* existing Patient.init object */ 
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: false
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    contact_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { sequelize, modelName: 'Patient', tableName: 'patients', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at', paranoid: true });
  return Patient;
};

const ReportModel = (sequelize, DataTypes) => {
  Report.init({ /* existing Report.init object */ 
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Patient,
        key: 'id'
      }
    },
    report_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    report_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { sequelize, modelName: 'Report', tableName: 'reports', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at', paranoid: true });
  return Report;
};

const CautionCardModel = (sequelize, DataTypes) => {
  CautionCard.init({ /* existing CautionCard.init object */ 
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null if card is orphaned
      references: {
        model: Patient,
        key: 'id'
      }
    },
    blood_type: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    antibodies: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    transfusion_requirements: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    imagePath: { // Corrected from file_path based on usage in routes
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'file_path' // Keep DB column name if it differs
    },
    mime_type: { // Added mime_type based on usage in routes
        type: DataTypes.STRING(100),
        allowNull: true
    },
    ocr_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    reviewed_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    reviewed_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { sequelize, modelName: 'CautionCard', tableName: 'caution_cards', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at', paranoid: true });
  return CautionCard;
};
