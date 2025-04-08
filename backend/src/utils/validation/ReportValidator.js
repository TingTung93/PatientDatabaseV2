const BaseValidator = require('./BaseValidator');

class ReportValidator extends BaseValidator {
  constructor() {
    super();
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',                                // Added TXT support
      'application/rtf',                           // Added RTF support
      'text/rtf',                                  // Alternative MIME type for RTF
      'application/x-rtf'                          // Another alternative MIME type for RTF
    ];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  validate(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, [
      'patient_id',
      'report_type',
      'file_path',
      'file_name',
      'file_size',
      'mime_type'
    ]);

    // Patient ID validation
    if (data.patient_id) {
      this.validateRange('patient_id', data.patient_id, 1, Number.MAX_SAFE_INTEGER);
    }

    // Report type validation
    if (data.report_type) {
      this.validateLength('report_type', data.report_type, 1, 50);
    }

    // File path validation
    if (data.file_path) {
      this.validateLength('file_path', data.file_path, 1, 500);
    }

    // File name validation
    if (data.file_name) {
      this.validateLength('file_name', data.file_name, 1, 255);
    }

    // File size validation
    if (data.file_size) {
      this.validateFileSize('file_size', data.file_size, this.maxFileSize);
    }

    // MIME type validation
    if (data.mime_type) {
      this.validateMimeType('mime_type', data.mime_type, this.allowedMimeTypes);
    }

    // OCR text validation (if provided)
    if (data.ocr_text) {
      this.validateLength('ocr_text', data.ocr_text, 1, 10000);
    }

    // Metadata validation (if provided)
    if (data.metadata) {
      this.validateJSON('metadata', data.metadata);
    }

    return !this.hasErrors();
  }

  validateUpdate(data) {
    // For updates, we only validate fields that are provided
    this.clearErrors();

    if (data.patient_id !== undefined) {
      this.validateRange('patient_id', data.patient_id, 1, Number.MAX_SAFE_INTEGER);
    }

    if (data.report_type !== undefined) {
      this.validateLength('report_type', data.report_type, 1, 50);
    }

    if (data.file_path !== undefined) {
      this.validateLength('file_path', data.file_path, 1, 500);
    }

    if (data.file_name !== undefined) {
      this.validateLength('file_name', data.file_name, 1, 255);
    }

    if (data.file_size !== undefined) {
      this.validateFileSize('file_size', data.file_size, this.maxFileSize);
    }

    if (data.mime_type !== undefined) {
      this.validateMimeType('mime_type', data.mime_type, this.allowedMimeTypes);
    }

    if (data.ocr_text !== undefined) {
      this.validateLength('ocr_text', data.ocr_text, 1, 10000);
    }

    if (data.metadata !== undefined) {
      this.validateJSON('metadata', data.metadata);
    }

    return !this.hasErrors();
  }
}

module.exports = ReportValidator;
