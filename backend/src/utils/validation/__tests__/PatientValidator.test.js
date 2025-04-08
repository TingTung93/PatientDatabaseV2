const PatientValidator = require('../PatientValidator');
const { ValidationError } = require('../../../errors/ValidationError');

describe('PatientValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PatientValidator();
  });

  describe('Constructor', () => {
    test('should initialize with correct blood types', () => {
      expect(validator.bloodTypes).toEqual([
        'A POS', 'A NEG', 'B POS', 'B NEG',
        'AB POS', 'AB NEG', 'O POS', 'O NEG'
      ]);
    });

    test('should initialize with correct genders', () => {
      expect(validator.genders).toEqual(['M', 'F', 'O']);
    });
  });

  describe('validate', () => {
    test('should validate valid patient data', () => {
      const validData = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'A POS',
        gender: 'M',
        contact_number: '+1234567890',
        antigen_phenotype: 'Rh+',
        transfusion_restrictions: 'None',
        antibodies: '[]',
        medical_history: 'No significant history',
        allergies: 'None',
        current_medications: 'None',
        comments: '[]'
      };

      expect(validator.validate(validData)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate required fields', () => {
      const invalidData = {
        name: '',
        dob: null,
        blood_type: undefined
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'dob' }),
          expect.objectContaining({ field: 'blood_type' })
        ])
      );
    });

    test('should validate blood type enum', () => {
      const invalidData = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'INVALID'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('blood_type');
    });

    test('should validate gender enum', () => {
      const invalidData = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'A POS',
        gender: 'INVALID'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('gender');
    });

    test('should validate contact number format', () => {
      const invalidData = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'A POS',
        contact_number: 'invalid'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('contact_number');
    });

    test('should validate JSON fields', () => {
      const invalidData = {
        name: 'John Doe',
        dob: '1990-01-01',
        blood_type: 'A POS',
        antibodies: 'invalid json',
        comments: 'invalid json'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(2);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'antibodies' }),
          expect.objectContaining({ field: 'comments' })
        ])
      );
    });

    test('should validate field lengths', () => {
      const invalidData = {
        name: 'J', // Too short
        dob: '1990-01-01',
        blood_type: 'A POS',
        antigen_phenotype: 'a'.repeat(501), // Too long
        transfusion_restrictions: 'a'.repeat(1001), // Too long
        medical_history: 'a'.repeat(5001), // Too long
        allergies: 'a'.repeat(1001), // Too long
        current_medications: 'a'.repeat(1001) // Too long
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(6);
    });
  });

  describe('validateUpdate', () => {
    test('should validate partial update data', () => {
      const validUpdate = {
        name: 'John Doe',
        blood_type: 'A POS'
      };

      expect(validator.validateUpdate(validUpdate)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate invalid partial update data', () => {
      const invalidUpdate = {
        name: 'J', // Too short
        blood_type: 'INVALID',
        gender: 'INVALID'
      };

      validator.validateUpdate(invalidUpdate);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'blood_type' }),
          expect.objectContaining({ field: 'gender' })
        ])
      );
    });

    test('should handle undefined values in update', () => {
      const update = {
        name: undefined,
        blood_type: undefined
      };

      expect(validator.validateUpdate(update)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate JSON fields in update', () => {
      const invalidUpdate = {
        name: 'John Doe',
        antibodies: 'invalid json',
        comments: 'invalid json'
      };

      validator.validateUpdate(invalidUpdate);
      expect(validator.getErrors()).toHaveLength(2);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'antibodies' }),
          expect.objectContaining({ field: 'comments' })
        ])
      );
    });
  });
}); 