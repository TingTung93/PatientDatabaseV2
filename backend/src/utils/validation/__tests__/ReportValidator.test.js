const ReportValidator = require('../ReportValidator');
const { ValidationError } = require('../../../errors/ValidationError');

describe('ReportValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new ReportValidator();
  });

  describe('Constructor', () => {
    test('should initialize with correct MIME types', () => {
      expect(validator.allowedMimeTypes).toEqual([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]);
    });

    test('should initialize with correct max file size', () => {
      expect(validator.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe('validate', () => {
    test('should validate valid report data', () => {
      const validData = {
        patient_id: 1,
        report_type: 'Blood Test',
        file_path: '/uploads/reports/blood_test.pdf',
        file_name: 'blood_test.pdf',
        file_size: 1024 * 1024, // 1MB
        mime_type: 'application/pdf',
        ocr_text: 'Blood test results...',
        metadata: '{"lab": "Central Lab", "date": "2024-04-02"}'
      };

      expect(validator.validate(validData)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate required fields', () => {
      const invalidData = {
        patient_id: null,
        report_type: '',
        file_path: undefined,
        file_name: null,
        file_size: undefined,
        mime_type: ''
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(6);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'patient_id' }),
          expect.objectContaining({ field: 'report_type' }),
          expect.objectContaining({ field: 'file_path' }),
          expect.objectContaining({ field: 'file_name' }),
          expect.objectContaining({ field: 'file_size' }),
          expect.objectContaining({ field: 'mime_type' })
        ])
      );
    });

    test('should validate patient ID range', () => {
      const invalidData = {
        patient_id: 0,
        report_type: 'Test',
        file_path: '/test.pdf',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('patient_id');
    });

    test('should validate file size limit', () => {
      const invalidData = {
        patient_id: 1,
        report_type: 'Test',
        file_path: '/test.pdf',
        file_name: 'test.pdf',
        file_size: 11 * 1024 * 1024, // 11MB
        mime_type: 'application/pdf'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('file_size');
    });

    test('should validate MIME type', () => {
      const invalidData = {
        patient_id: 1,
        report_type: 'Test',
        file_path: '/test.pdf',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'invalid/type'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('mime_type');
    });

    test('should validate field lengths', () => {
      const invalidData = {
        patient_id: 1,
        report_type: 'a'.repeat(51), // Too long
        file_path: 'a'.repeat(501), // Too long
        file_name: 'a'.repeat(256), // Too long
        file_size: 1024,
        mime_type: 'application/pdf',
        ocr_text: 'a'.repeat(10001) // Too long
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(4);
    });

    test('should validate JSON metadata', () => {
      const invalidData = {
        patient_id: 1,
        report_type: 'Test',
        file_path: '/test.pdf',
        file_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        metadata: 'invalid json'
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('metadata');
    });
  });

  describe('validateUpdate', () => {
    test('should validate partial update data', () => {
      const validUpdate = {
        report_type: 'Updated Report',
        file_size: 2048
      };

      expect(validator.validateUpdate(validUpdate)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate invalid partial update data', () => {
      const invalidUpdate = {
        report_type: 'a'.repeat(51), // Too long
        file_size: 11 * 1024 * 1024, // Too large
        mime_type: 'invalid/type'
      };

      validator.validateUpdate(invalidUpdate);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'report_type' }),
          expect.objectContaining({ field: 'file_size' }),
          expect.objectContaining({ field: 'mime_type' })
        ])
      );
    });

    test('should handle undefined values in update', () => {
      const update = {
        report_type: undefined,
        file_size: undefined
      };

      expect(validator.validateUpdate(update)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate JSON metadata in update', () => {
      const invalidUpdate = {
        report_type: 'Test',
        metadata: 'invalid json'
      };

      validator.validateUpdate(invalidUpdate);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('metadata');
    });
  });
}); 