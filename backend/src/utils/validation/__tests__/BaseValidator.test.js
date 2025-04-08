const BaseValidator = require('../BaseValidator');
const { ValidationError } = require('../../../errors/ValidationError');

describe('BaseValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new BaseValidator();
  });

  describe('Error Management', () => {
    test('should add error correctly', () => {
      validator.addError('test', 'Test error');
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0]).toEqual({
        field: 'test',
        message: 'Test error'
      });
    });

    test('should clear errors correctly', () => {
      validator.addError('test', 'Test error');
      validator.clearErrors();
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should check for errors correctly', () => {
      expect(validator.hasErrors()).toBe(false);
      validator.addError('test', 'Test error');
      expect(validator.hasErrors()).toBe(true);
    });
  });

  describe('Required Field Validation', () => {
    test('should validate required fields correctly', () => {
      const data = {
        field1: 'value1',
        field2: '',
        field3: null,
        field4: undefined
      };

      validator.validateRequired(data, ['field1', 'field2', 'field3', 'field4']);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'field2' }),
          expect.objectContaining({ field: 'field3' }),
          expect.objectContaining({ field: 'field4' })
        ])
      );
    });
  });

  describe('Length Validation', () => {
    test('should validate string length correctly', () => {
      validator.validateLength('test', 'short', 5, 10);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be between 5 and 10 characters');

      validator.clearErrors();
      validator.validateLength('test', 'valid length', 5, 10);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateLength('test', null, 5, 10);
      validator.validateLength('test', undefined, 5, 10);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Date Validation', () => {
    test('should validate date format correctly', () => {
      validator.validateDate('test', 'invalid-date');
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be a valid date');

      validator.clearErrors();
      validator.validateDate('test', '2024-04-02');
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateDate('test', null);
      validator.validateDate('test', undefined);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Enum Validation', () => {
    test('should validate enum values correctly', () => {
      const allowedValues = ['value1', 'value2'];
      validator.validateEnum('test', 'invalid', allowedValues);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be one of');

      validator.clearErrors();
      validator.validateEnum('test', 'value1', allowedValues);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateEnum('test', null, ['value1']);
      validator.validateEnum('test', undefined, ['value1']);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Email Validation', () => {
    test('should validate email format correctly', () => {
      validator.validateEmail('test', 'invalid-email');
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be a valid email address');

      validator.clearErrors();
      validator.validateEmail('test', 'test@example.com');
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateEmail('test', null);
      validator.validateEmail('test', undefined);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Phone Validation', () => {
    test('should validate phone format correctly', () => {
      validator.validatePhone('test', 'invalid-phone');
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be a valid phone number');

      validator.clearErrors();
      validator.validatePhone('test', '+1234567890');
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validatePhone('test', null);
      validator.validatePhone('test', undefined);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('JSON Validation', () => {
    test('should validate JSON format correctly', () => {
      validator.validateJSON('test', 'invalid-json');
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be valid JSON');

      validator.clearErrors();
      validator.validateJSON('test', '{"key": "value"}');
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateJSON('test', null);
      validator.validateJSON('test', undefined);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Range Validation', () => {
    test('should validate numeric range correctly', () => {
      validator.validateRange('test', 'invalid', 1, 10);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be between');

      validator.clearErrors();
      validator.validateRange('test', 5, 1, 10);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateRange('test', null, 1, 10);
      validator.validateRange('test', undefined, 1, 10);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('File Size Validation', () => {
    test('should validate file size correctly', () => {
      validator.validateFileSize('test', 11 * 1024 * 1024, 10 * 1024 * 1024);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be less than');

      validator.clearErrors();
      validator.validateFileSize('test', 5 * 1024 * 1024, 10 * 1024 * 1024);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateFileSize('test', null, 10 * 1024 * 1024);
      validator.validateFileSize('test', undefined, 10 * 1024 * 1024);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('MIME Type Validation', () => {
    test('should validate MIME type correctly', () => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      validator.validateMimeType('test', 'invalid/type', allowedTypes);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].message).toContain('must be one of');

      validator.clearErrors();
      validator.validateMimeType('test', 'image/jpeg', allowedTypes);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should handle null/undefined values', () => {
      validator.validateMimeType('test', null, ['image/jpeg']);
      validator.validateMimeType('test', undefined, ['image/jpeg']);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('Error Throwing', () => {
    test('should throw ValidationError when errors exist', () => {
      validator.addError('test', 'Test error');
      expect(() => validator.throwIfErrors()).toThrow(ValidationError);
      expect(() => validator.throwIfErrors()).toThrow('Validation failed');
    });

    test('should not throw when no errors exist', () => {
      expect(() => validator.throwIfErrors()).not.toThrow();
    });
  });
}); 