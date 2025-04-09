import BaseValidator from './BaseValidator.js';
import ValidationError from '../../errors/ValidationError.js';

class UserValidator extends BaseValidator {
  constructor() {
    super();
    this.allowedRoles = ['admin', 'user', 'viewer'];
    this.minPasswordLength = 8;
    this.maxPasswordLength = 100;
  }

  validate(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['username', 'email', 'password', 'role']);

    // Username validation
    if (data.username) {
      this.validateLength(data.username, 3, 50, 'username');
      this.validatePattern(data.username, /^[a-zA-Z0-9_-]+$/, 'username', 'Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Email validation
    if (data.email) {
      this.validateEmail(data.email);
    }

    // Password validation
    if (data.password) {
      this.validateLength(data.password, this.minPasswordLength, this.maxPasswordLength, 'password');
      this.validatePattern(
        data.password,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'password',
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }

    // Role validation
    if (data.role) {
      this.validateEnum(data.role, this.allowedRoles, 'role');
    }

    // Optional fields validation
    if (data.firstName) {
      this.validateLength(data.firstName, 2, 50, 'firstName');
    }

    if (data.lastName) {
      this.validateLength(data.lastName, 2, 50, 'lastName');
    }

    if (data.phone) {
      this.validatePhone(data.phone);
    }

    if (data.department) {
      this.validateLength(data.department, 2, 100, 'department');
    }

    if (data.isActive !== undefined) {
      this.validateBoolean(data.isActive, 'isActive');
    }

    if (data.lastLogin) {
      this.validateDate(data.lastLogin);
    }

    if (data.preferences) {
      this.validateJSON(data.preferences);
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid user data', this.getErrors());
    }

    return true;
  }

  validateUpdate(data) {
    this.clearErrors();

    // Username validation if provided
    if (data.username) {
      this.validateLength(data.username, 3, 50, 'username');
      this.validatePattern(data.username, /^[a-zA-Z0-9_-]+$/, 'username', 'Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Email validation if provided
    if (data.email) {
      this.validateEmail(data.email);
    }

    // Password validation if provided
    if (data.password) {
      this.validateLength(data.password, this.minPasswordLength, this.maxPasswordLength, 'password');
      this.validatePattern(
        data.password,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'password',
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }

    // Role validation if provided
    if (data.role) {
      this.validateEnum(data.role, this.allowedRoles, 'role');
    }

    // Optional fields validation
    if (data.firstName) {
      this.validateLength(data.firstName, 2, 50, 'firstName');
    }

    if (data.lastName) {
      this.validateLength(data.lastName, 2, 50, 'lastName');
    }

    if (data.phone) {
      this.validatePhone(data.phone);
    }

    if (data.department) {
      this.validateLength(data.department, 2, 100, 'department');
    }

    if (data.isActive !== undefined) {
      this.validateBoolean(data.isActive, 'isActive');
    }

    if (data.lastLogin) {
      this.validateDate(data.lastLogin);
    }

    if (data.preferences) {
      this.validateJSON(data.preferences);
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid user update data', this.getErrors());
    }

    return true;
  }

  validateLogin(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['username', 'password']);

    // Username validation
    if (data.username) {
      this.validateLength(data.username, 3, 50, 'username');
      this.validatePattern(data.username, /^[a-zA-Z0-9_-]+$/, 'username', 'Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Password validation
    if (data.password) {
      this.validateLength(data.password, this.minPasswordLength, this.maxPasswordLength, 'password');
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid login data', this.getErrors());
    }

    return true;
  }

  validatePasswordReset(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['email']);

    // Email validation
    if (data.email) {
      this.validateEmail(data.email);
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid password reset data', this.getErrors());
    }

    return true;
  }

  validatePasswordChange(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['currentPassword', 'newPassword']);

    // Current password validation
    if (data.currentPassword) {
      this.validateLength(data.currentPassword, this.minPasswordLength, this.maxPasswordLength, 'currentPassword');
    }

    // New password validation
    if (data.newPassword) {
      this.validateLength(data.newPassword, this.minPasswordLength, this.maxPasswordLength, 'newPassword');
      this.validatePattern(
        data.newPassword,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'newPassword',
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid password change data', this.getErrors());
    }

    return true;
  }
}

export default UserValidator; 