const RoleValidator = require('../RoleValidator');
const ValidationError = require('../../../errors/ValidationError');

describe('RoleValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new RoleValidator();
  });

  describe('validate', () => {
    test('should validate valid role data', () => {
      const validData = {
        name: 'admin_role',
        description: 'Administrator role with full system access',
        permissions: ['admin', 'manage:users', 'manage:roles'],
        isActive: true,
        metadata: { createdBy: 'system' }
      };

      expect(() => validator.validate(validData)).not.toThrow();
    });

    test('should validate required fields', () => {
      const invalidData = {
        name: 'admin_role'
        // Missing required fields
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      const errors = validator.getErrors();
      expect(errors).toHaveProperty('description');
      expect(errors).toHaveProperty('permissions');
    });

    test('should validate name format', () => {
      const invalidData = {
        name: 'admin role', // Contains space
        description: 'Administrator role',
        permissions: ['admin']
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('name');
    });

    test('should validate description length', () => {
      const invalidData = {
        name: 'admin_role',
        description: 'Too short', // Too short
        permissions: ['admin']
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('description');
    });

    test('should validate permissions array', () => {
      const invalidData = {
        name: 'admin_role',
        description: 'Administrator role with full system access',
        permissions: 'not_an_array' // Not an array
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions');
    });

    test('should validate permission values', () => {
      const invalidData = {
        name: 'admin_role',
        description: 'Administrator role with full system access',
        permissions: ['invalid_permission']
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions[0]');
    });

    test('should validate metadata format', () => {
      const invalidData = {
        name: 'admin_role',
        description: 'Administrator role with full system access',
        permissions: ['admin'],
        metadata: 'not_an_object' // Not an object
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('metadata');
    });
  });

  describe('validateUpdate', () => {
    test('should validate valid update data', () => {
      const validData = {
        name: 'admin_role_updated',
        description: 'Updated administrator role description',
        permissions: ['admin', 'manage:users']
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should validate partial updates', () => {
      const validData = {
        description: 'Updated description'
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should validate permission updates', () => {
      const validData = {
        permissions: ['admin', 'manage:users']
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should reject invalid permission in update', () => {
      const invalidData = {
        permissions: ['invalid_permission']
      };

      expect(() => validator.validateUpdate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions[0]');
    });
  });

  describe('validatePermissionAssignment', () => {
    test('should validate valid permission assignment', () => {
      const validData = {
        permissions: ['read:patients', 'write:patients']
      };

      expect(() => validator.validatePermissionAssignment(validData)).not.toThrow();
    });

    test('should validate required permissions field', () => {
      const invalidData = {
        // Missing permissions
      };

      expect(() => validator.validatePermissionAssignment(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions');
    });

    test('should validate permissions array', () => {
      const invalidData = {
        permissions: 'not_an_array'
      };

      expect(() => validator.validatePermissionAssignment(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions');
    });

    test('should validate permission values', () => {
      const invalidData = {
        permissions: ['invalid_permission']
      };

      expect(() => validator.validatePermissionAssignment(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('permissions[0]');
    });
  });
}); 