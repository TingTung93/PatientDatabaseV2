const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PasswordReset extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  PasswordReset.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'PasswordReset',
    tableName: 'password_resets',
    underscored: true,
    timestamps: true
  });

  return PasswordReset;
}; 