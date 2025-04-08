const bcrypt = require('bcrypt')
const { DataTypes } = require('sequelize')

module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        role: {
            type: DataTypes.ENUM('admin', 'doctor', 'nurse', 'staff'),
            defaultValue: 'staff',
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        last_login: {
            type: DataTypes.DATE,
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
        deletedAt: 'deleted_at',
        defaultScope: {
            attributes: {
                exclude: ['password_hash']
            }
        },
        scopes: {
            withPassword: {
                attributes: {
                    include: ['password_hash']
                }
            }
        },
        indexes: [
            {
                unique: true,
                fields: ['username']
            },
            {
                unique: true,
                fields: ['email']
            }
        ]
    })

    // Static method to validate password
    User.validatePassword = function(password) {
        // At least 8 characters
        if (!password || password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters' };
        }
        
        // Must contain uppercase, lowercase, and digit
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        
        if (!hasUppercase) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!hasLowercase) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!hasDigit) {
            return { valid: false, message: 'Password must contain at least one digit' };
        }
        
        return { valid: true };
    };
    
    // Instance method to set password (with validation)
    User.prototype.setPassword = async function(password) {
        // Validate password
        const validation = User.validatePassword(password);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        
        // Generate hash with built-in salt
        this.password_hash = await bcrypt.hash(password, 12);
    };

    // Instance method to verify password
    User.prototype.verifyPassword = function(password) {
        return bcrypt.compareSync(password, this.password_hash);
    };

    return User;
};