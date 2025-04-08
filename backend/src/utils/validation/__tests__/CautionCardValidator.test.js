const CautionCardValidator = require('../CautionCardValidator');
const { ValidationError } = require('../../../errors/ValidationError');

describe('CautionCardValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new CautionCardValidator();
  });

  describe('Constructor', () => {
    test('should initialize with correct statuses', () => {
      expect(validator.allowedStatuses).toEqual([
        'processing_ocr',
        'pending_review',
        'linked',
        'orphaned'
      ]);
    });

    test('should initialize with correct MIME types', () => {
      expect(validator.allowedMimeTypes).toEqual([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff'
      ]);
    });

    test('should initialize with correct max file size', () => {
      expect(validator.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe('validate', () => {
    test('should validate valid caution card data', () => {
      const validData = {
        originalFilePath: '/uploads/cards/test.pdf',
        status: 'processing_ocr',
        metadata: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024 * 1024,
          uploadedAt: '2024-04-02T12:00:00Z'
        }
      };

      expect(validator.validate(validData)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate required fields', () => {
      const invalidData = {
        originalFilePath: null,
        status: undefined,
        metadata: null
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'originalFilePath' }),
          expect.objectContaining({ field: 'status' }),
          expect.objectContaining({ field: 'metadata' })
        ])
      );
    });

    test('should validate status enum', () => {
      const invalidData = {
        originalFilePath: '/test.pdf',
        status: 'invalid_status',
        metadata: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: '2024-04-02T12:00:00Z'
        }
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('status');
    });

    test('should validate metadata structure', () => {
      const invalidData = {
        originalFilePath: '/test.pdf',
        status: 'processing_ocr',
        metadata: {
          originalName: 'test.pdf'
          // Missing required fields
        }
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('metadata');
    });

    test('should validate file metadata', () => {
      const invalidData = {
        originalFilePath: '/test.pdf',
        status: 'processing_ocr',
        metadata: {
          originalName: 'test.pdf',
          mimeType: 'invalid/type',
          size: 11 * 1024 * 1024,
          uploadedAt: '2024-04-02T12:00:00Z'
        }
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(2);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'metadata.mimeType' }),
          expect.objectContaining({ field: 'metadata.size' })
        ])
      );
    });

    test('should validate reviewed data structure', () => {
      const invalidData = {
        originalFilePath: '/test.pdf',
        status: 'processing_ocr',
        metadata: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: '2024-04-02T12:00:00Z'
        },
        reviewedData: {
          // Missing patientName
        }
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('reviewedData');
    });

    test('should validate linked patient ID', () => {
      const invalidData = {
        originalFilePath: '/test.pdf',
        status: 'processing_ocr',
        metadata: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: '2024-04-02T12:00:00Z'
        },
        linkedPatientId: 0
      };

      validator.validate(invalidData);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('linkedPatientId');
    });
  });

  describe('validateUpdate', () => {
    test('should validate valid update data', () => {
      const validUpdate = {
        status: 'pending_review',
        reviewedData: {
          patientName: 'John Doe'
        }
      };

      expect(validator.validateUpdate(validUpdate)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should validate invalid update data', () => {
      const invalidUpdate = {
        status: 'invalid_status',
        metadata: {
          mimeType: 'invalid/type',
          size: 11 * 1024 * 1024
        },
        reviewedData: {
          // Missing patientName
        }
      };

      validator.validateUpdate(invalidUpdate);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'status' }),
          expect.objectContaining({ field: 'metadata.mimeType' }),
          expect.objectContaining({ field: 'metadata.size' })
        ])
      );
    });

    test('should handle undefined values in update', () => {
      const update = {
        status: undefined,
        reviewedData: undefined
      };

      expect(validator.validateUpdate(update)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('validateFileMetadata', () => {
    test('should validate valid file metadata', () => {
      const validFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024
      };

      expect(validator.validateFileMetadata(validFile)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should reject missing file', () => {
      expect(validator.validateFileMetadata(null)).toBe(false);
      expect(validator.getErrors()).toHaveLength(1);
      expect(validator.getErrors()[0].field).toBe('file');
    });

    test('should reject invalid file metadata', () => {
      const invalidFile = {
        originalname: '',
        mimetype: 'invalid/type',
        size: 11 * 1024 * 1024
      };

      expect(validator.validateFileMetadata(invalidFile)).toBe(false);
      expect(validator.getErrors()).toHaveLength(3);
      expect(validator.getErrors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'originalname' }),
          expect.objectContaining({ field: 'mimetype' }),
          expect.objectContaining({ field: 'size' })
        ])
      );
    });
  });
}); 