import { fileValidationService, FileTypeCategory, ValidationError } from '../FileValidationService';

describe('FileValidationService', () => {
  // Mock file creation helper
  const createMockFile = (name: string, size: number, type: string): File => {
    return new File(['mock content'], name, { type });
  };

  describe('validateFile', () => {
    it('should reject files larger than maximum size', () => {
      const maxSizeMB = fileValidationService.getMaxFileSizeMB();
      const oversizedFile = createMockFile(
        'large.jpg',
        (maxSizeMB + 1) * 1024 * 1024,
        'image/jpeg'
      );

      const result = fileValidationService.validateFile(
        oversizedFile,
        FileTypeCategory.CautionCard
      );
      expect(result).toEqual({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      });
    });

    it('should accept valid JPG files for caution cards', () => {
      const validJpg = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const result = fileValidationService.validateFile(validJpg, FileTypeCategory.CautionCard);
      expect(result).toBeNull();
    });

    it('should accept valid PNG files for caution cards', () => {
      const validPng = createMockFile('test.png', 1024 * 1024, 'image/png');
      const result = fileValidationService.validateFile(validPng, FileTypeCategory.CautionCard);
      expect(result).toBeNull();
    });

    it('should reject files with invalid types for caution cards', () => {
      const invalidFile = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const result = fileValidationService.validateFile(invalidFile, FileTypeCategory.CautionCard);
      expect(result).toEqual({
        code: 'INVALID_FILE_TYPE',
        message: 'File type not allowed. Please upload a PNG or JPG file.',
      });
    });

    it('should reject empty files', () => {
      const emptyFile = createMockFile('empty.jpg', 0, 'image/jpeg');
      const result = fileValidationService.validateFile(emptyFile, FileTypeCategory.CautionCard);
      expect(result).toEqual({
        code: 'EMPTY_FILE',
        message: 'File is empty',
      });
    });
  });

  describe('getAcceptString', () => {
    it('should return correct accept string for caution cards', () => {
      const acceptString = fileValidationService.getAcceptString(FileTypeCategory.CautionCard);
      expect(acceptString).toBe('image/jpeg,image/png,.jpg,.jpeg,.png');
    });
  });

  describe('getMaxFileSizeMB', () => {
    it('should return a positive number for max file size', () => {
      const maxSize = fileValidationService.getMaxFileSizeMB();
      expect(maxSize).toBeGreaterThan(0);
      expect(Number.isInteger(maxSize)).toBe(true);
    });
  });
});
