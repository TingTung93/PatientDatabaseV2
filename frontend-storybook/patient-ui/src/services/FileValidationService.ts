import { configService } from './ConfigService';

export enum FileTypeCategory {
  Report = 'report',
  CautionCard = 'cautionCard',
}

export interface ValidationError {
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE';
  message: string;
}

/**
 * Service for validating files based on type and size constraints.
 * Uses configuration provided by ConfigService.
 */
export class FileValidationService {
  private static instance: FileValidationService;
  private readonly config = configService.getFileUploadConfig();

  private constructor() {}

  /**
   * Gets the singleton instance of the FileValidationService.
   * @returns {FileValidationService} The singleton instance.
   */
  public static getInstance(): FileValidationService {
    if (!FileValidationService.instance) {
      FileValidationService.instance = new FileValidationService();
    }
    return FileValidationService.instance;
  }

  /**
   * Validates a file based on its category (Report or Caution Card).
   * Checks against allowed types and maximum size defined in the configuration.
   *
   * @param {File} file - The file to validate.
   * @param {FileTypeCategory} category - The category of the file (Report or CautionCard).
   * @returns {ValidationError | null} A validation error object if validation fails, otherwise null.
   */
  public validateFile(file: File, category: FileTypeCategory): ValidationError | null {
    const allowedTypes =
      category === FileTypeCategory.Report
        ? this.config.allowedReportTypes
        : this.config.allowedCautionCardTypes;

    const maxSize = this.config.maxFileSizeBytes;
    const maxSizeMB = this.config.maxFileSizeMB;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes.map(type => type.split('/')[1]).join(', ');
      return {
        code: 'INVALID_TYPE',
        message: `Invalid file type. Allowed types: ${allowedExtensions}.`,
      };
    }

    // Validate file size
    if (file.size > maxSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: `File is too large. Maximum size: ${maxSizeMB} MB.`,
      };
    }

    return null; // File is valid
  }

  /**
   * Gets the accept string for file input elements based on the category.
   *
   * @param {FileTypeCategory} category - The category of the file (Report or CautionCard).
   * @returns {string} A comma-separated string of allowed MIME types.
   */
  public getAcceptString(category: FileTypeCategory): string {
    const allowedTypes =
      category === FileTypeCategory.Report
        ? this.config.allowedReportTypes
        : this.config.allowedCautionCardTypes;
    return allowedTypes.join(',');
  }

  /**
   * Gets the maximum allowed file size in MB.
   * @returns {number} Maximum file size in megabytes.
   */
  public getMaxFileSizeMB(): number {
    return this.config.maxFileSizeMB;
  }
}

// Export a singleton instance for easy use
export const fileValidationService = FileValidationService.getInstance();
