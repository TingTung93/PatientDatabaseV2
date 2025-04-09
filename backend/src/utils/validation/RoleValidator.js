import BaseValidator from './BaseValidator.js';
import ValidationError from '../../errors/ValidationError.js';

class RoleValidator extends BaseValidator {
  constructor() {
    super();
    this.allowedPermissions = [
      'read:patients',
      'write:patients',
      'delete:patients',
      'read:reports',
      'write:reports',
      'delete:reports',
      'read:caution-cards',
      'write:caution-cards',
      'delete:caution-cards',
      'manage:users',
      'manage:roles',
      'admin'
    ];
  }

  validate(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['name', 'description', 'permissions']);

    // Name validation
    if (data.name) {
      this.validateLength(data.name, 3, 50, 'name');
      this.validatePattern(data.name, /^[a-zA-Z0-9_-]+$/, 'name', 'Role name can only contain letters, numbers, underscores, and hyphens');
    }

    // Description validation
    if (data.description) {
      this.validateLength(data.description, 10, 200, 'description');
    }

    // Permissions validation
    if (data.permissions) {
      this.validateArray(data.permissions, 'permissions');
      if (Array.isArray(data.permissions)) {
        data.permissions.forEach((permission, index) => {
          if (!this.allowedPermissions.includes(permission)) {
            this.addError(`permissions[${index}]`, `Invalid permission: ${permission}`);
          }
        });
      }
    }

    // Optional fields validation
    if (data.isActive !== undefined) {
      this.validateBoolean(data.isActive, 'isActive');
    }

    if (data.metadata) {
      this.validateJSON(data.metadata);
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid role data', this.getErrors());
    }

    return true;
  }

  validateUpdate(data) {
    this.clearErrors();

    // Name validation if provided
    if (data.name) {
      this.validateLength(data.name, 3, 50, 'name');
      this.validatePattern(data.name, /^[a-zA-Z0-9_-]+$/, 'name', 'Role name can only contain letters, numbers, underscores, and hyphens');
    }

    // Description validation if provided
    if (data.description) {
      this.validateLength(data.description, 10, 200, 'description');
    }

    // Permissions validation if provided
    if (data.permissions) {
      this.validateArray(data.permissions, 'permissions');
      if (Array.isArray(data.permissions)) {
        data.permissions.forEach((permission, index) => {
          if (!this.allowedPermissions.includes(permission)) {
            this.addError(`permissions[${index}]`, `Invalid permission: ${permission}`);
          }
        });
      }
    }

    // Optional fields validation
    if (data.isActive !== undefined) {
      this.validateBoolean(data.isActive, 'isActive');
    }

    if (data.metadata) {
      this.validateJSON(data.metadata);
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid role update data', this.getErrors());
    }

    return true;
  }

  validatePermissionAssignment(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, ['permissions']);

    // Permissions validation
    if (data.permissions) {
      this.validateArray(data.permissions, 'permissions');
      if (Array.isArray(data.permissions)) {
        data.permissions.forEach((permission, index) => {
          if (!this.allowedPermissions.includes(permission)) {
            this.addError(`permissions[${index}]`, `Invalid permission: ${permission}`);
          }
        });
      }
    }

    if (this.hasErrors()) {
      throw new ValidationError('Invalid permission assignment data', this.getErrors());
    }

    return true;
  }
}

export default RoleValidator; 