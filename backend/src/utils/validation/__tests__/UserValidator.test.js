const UserValidator = require('../UserValidator');
const ValidationError = require('../../../errors/ValidationError');

describe('UserValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new UserValidator();
  });

  describe('validate', () => {
    test('should validate valid user data', () => {
      const validData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Test123!@#',
        role: 'user',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        department: 'IT',
        isActive: true,
        lastLogin: '2024-03-20T10:00:00Z',
        preferences: { theme: 'dark' }
      };

      expect(() => validator.validate(validData)).not.toThrow();
    });

    test('should validate required fields', () => {
      const invalidData = {
        username: 'john_doe'
        // Missing required fields
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      const errors = validator.getErrors();
      expect(errors).toHaveProperty('email');
      expect(errors).toHaveProperty('password');
      expect(errors).toHaveProperty('role');
    });

    test('should validate username format', () => {
      const invalidData = {
        username: 'john doe', // Contains space
        email: 'john@example.com',
        password: 'Test123!@#',
        role: 'user'
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('username');
    });

    test('should validate email format', () => {
      const invalidData = {
        username: 'john_doe',
        email: 'invalid-email',
        password: 'Test123!@#',
        role: 'user'
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('email');
    });

    test('should validate password requirements', () => {
      const invalidData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'weak', // Too weak
        role: 'user'
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('password');
    });

    test('should validate role enum', () => {
      const invalidData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Test123!@#',
        role: 'invalid_role'
      };

      expect(() => validator.validate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('role');
    });
  });

  describe('validateUpdate', () => {
    test('should validate valid update data', () => {
      const validData = {
        username: 'john_doe_updated',
        email: 'john.updated@example.com',
        firstName: 'Johnny',
        lastName: 'Doe Jr'
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should validate partial updates', () => {
      const validData = {
        firstName: 'Johnny'
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should validate password update', () => {
      const validData = {
        password: 'NewTest123!@#'
      };

      expect(() => validator.validateUpdate(validData)).not.toThrow();
    });

    test('should reject invalid password in update', () => {
      const invalidData = {
        password: 'weak'
      };

      expect(() => validator.validateUpdate(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('password');
    });
  });

  describe('validateLogin', () => {
    test('should validate valid login data', () => {
      const validData = {
        username: 'john_doe',
        password: 'Test123!@#'
      };

      expect(() => validator.validateLogin(validData)).not.toThrow();
    });

    test('should validate required fields for login', () => {
      const invalidData = {
        username: 'john_doe'
        // Missing password
      };

      expect(() => validator.validateLogin(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('password');
    });

    test('should validate username format for login', () => {
      const invalidData = {
        username: 'john doe', // Contains space
        password: 'Test123!@#'
      };

      expect(() => validator.validateLogin(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('username');
    });
  });

  describe('validatePasswordReset', () => {
    test('should validate valid password reset data', () => {
      const validData = {
        email: 'john@example.com'
      };

      expect(() => validator.validatePasswordReset(validData)).not.toThrow();
    });

    test('should validate required email for password reset', () => {
      const invalidData = {
        // Missing email
      };

      expect(() => validator.validatePasswordReset(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('email');
    });

    test('should validate email format for password reset', () => {
      const invalidData = {
        email: 'invalid-email'
      };

      expect(() => validator.validatePasswordReset(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('email');
    });
  });

  describe('validatePasswordChange', () => {
    test('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'OldTest123!@#',
        newPassword: 'NewTest123!@#'
      };

      expect(() => validator.validatePasswordChange(validData)).not.toThrow();
    });

    test('should validate required fields for password change', () => {
      const invalidData = {
        currentPassword: 'OldTest123!@#'
        // Missing newPassword
      };

      expect(() => validator.validatePasswordChange(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('newPassword');
    });

    test('should validate new password requirements', () => {
      const invalidData = {
        currentPassword: 'OldTest123!@#',
        newPassword: 'weak'
      };

      expect(() => validator.validatePasswordChange(invalidData)).toThrow(ValidationError);
      expect(validator.getErrors()).toHaveProperty('newPassword');
    });
  });
}); 