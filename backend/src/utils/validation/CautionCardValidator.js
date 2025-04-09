import BaseValidator from './BaseValidator.js';

class CautionCardValidator extends BaseValidator {
  constructor() {
    super();
    this.allowedStatuses = ['processing_ocr', 'pending_review', 'linked', 'orphaned'];
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Validates caution card data
   * @param {Object} data - The caution card data to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validate(data) {
    this.clearErrors();

    // Required fields - Pass fields as arrays
    this.validateRequired(data, ['originalFilePath']);
    this.validateRequired(data, ['status']);
    this.validateRequired(data, ['metadata']);

    // Status validation
    if (data.status) {
      this.validateEnum(data.status, 'status', this.allowedStatuses);
    }

    // Metadata validation
    if (data.metadata) {
      this.validateJSON(data.metadata, 'metadata');
      
      // Validate metadata structure if it's a string
      if (typeof data.metadata === 'string') {
        try {
          const parsed = JSON.parse(data.metadata);
          if (!parsed.originalName || !parsed.mimeType || !parsed.size || !parsed.uploadedAt) {
            this.addError('metadata', 'Invalid metadata structure');
          }
        } catch (error) {
          this.addError('metadata', 'Invalid JSON format');
        }
      }
    }

    // File validation
    if (data.metadata?.mimeType) {
      this.validateMimeType(data.metadata.mimeType, 'metadata.mimeType', this.allowedMimeTypes);
    }

    if (data.metadata?.size) {
      this.validateFileSize(data.metadata.size, 'metadata.size', this.maxFileSize);
    }

    // Optional fields
    if (data.reviewedData) {
      this.validateJSON(data.reviewedData, 'reviewedData');
      
      // Validate reviewedData structure if it's a string
      if (typeof data.reviewedData === 'string') {
        try {
          const parsed = JSON.parse(data.reviewedData);
          if (!parsed.patientName) {
            this.addError('reviewedData', 'Patient name is required in review data');
          }
        } catch (error) {
          this.addError('reviewedData', 'Invalid JSON format');
        }
      }
    }

    if (data.linkedPatientId) {
      this.validateRange(data.linkedPatientId, 'linkedPatientId', 1);
    }

    return this.getErrors().length === 0;
  }

  /**
   * Validates caution card update data
   * @param {Object} data - The caution card update data to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateUpdate(data) {
    this.clearErrors();

    // Status validation
    if (data.status) {
      this.validateEnum(data.status, 'status', this.allowedStatuses);
    }

    // Metadata validation
    if (data.metadata) {
      this.validateJSON(data.metadata, 'metadata');
      
      // Validate metadata structure if it's a string
      if (typeof data.metadata === 'string') {
        try {
          const parsed = JSON.parse(data.metadata);
          if (parsed.mimeType) {
            this.validateMimeType(parsed.mimeType, 'metadata.mimeType', this.allowedMimeTypes);
          }
          if (parsed.size) {
            this.validateFileSize(parsed.size, 'metadata.size', this.maxFileSize);
          }
        } catch (error) {
          this.addError('metadata', 'Invalid JSON format');
        }
      }
    }

    // Optional fields
    if (data.reviewedData) {
      this.validateJSON(data.reviewedData, 'reviewedData');
      
      // Validate reviewedData structure if it's a string
      if (typeof data.reviewedData === 'string') {
        try {
          const parsed = JSON.parse(data.reviewedData);
          if (!parsed.patientName) {
            this.addError('reviewedData', 'Patient name is required in review data');
          }
        } catch (error) {
          this.addError('reviewedData', 'Invalid JSON format');
        }
      }
    }

    if (data.linkedPatientId) {
      this.validateRange(data.linkedPatientId, 'linkedPatientId', 1);
    }

    return this.getErrors().length === 0;
  }

  /**
   * Validates file metadata
   * @param {Object} file - The file object from multer
   * @returns {boolean} True if valid, false otherwise
   */
  validateFileMetadata(file) {
    this.clearErrors();

    if (!file) {
      this.addError('file', 'File is required');
      return false;
    }

    this.validateMimeType(file.mimetype, 'mimetype', this.allowedMimeTypes);
    this.validateFileSize(file.size, 'size', this.maxFileSize);
    this.validateLength(file.originalname, 'originalname', 1, 255);

    return this.getErrors().length === 0;
  }
}

export default CautionCardValidator; 