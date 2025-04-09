import { Model, DataTypes } from 'sequelize';

// Basic User model for authentication and association
export default (sequelize) => {
  class User extends Model {
    static associate(models) {
      // Define associations here
      this.hasMany(models.PasswordReset, {
        foreignKey: 'user_id',
        as: 'passwordResets'
      });
      // Add other associations like roles, permissions, etc. if needed
    }
    
    // You might add instance methods here, e.g., for password checking
    // async validPassword(password) { ... }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Add other fields like first_name, last_name, role, is_active, etc.
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true, // Use snake_case for createdAt/updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};