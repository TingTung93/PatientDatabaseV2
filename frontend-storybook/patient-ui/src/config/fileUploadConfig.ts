/**
 * Configuration for file uploads.
 */
export interface FileUploadConfig {
  allowedReportTypes: string[];
  allowedCautionCardTypes: string[];
  maxFileSizeMB: number;
  maxFileSizeBytes: number;
  reportUploadApiEndpoint: (patientId: string) => string;
  cautionCardUploadApiEndpoint: (patientId: string) => string;
}

const MAX_FILE_SIZE_MB = 5;

export const fileUploadConfig: FileUploadConfig = {
  allowedReportTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ], // PDF, DOCX
  allowedCautionCardTypes: ['image/png', 'image/jpeg'], // PNG, JPG/JPEG
  maxFileSizeMB: MAX_FILE_SIZE_MB,
  maxFileSizeBytes: MAX_FILE_SIZE_MB * 1024 * 1024,
  reportUploadApiEndpoint: (patientId: string) => `/api/v1/patients/${patientId}/reports`,
  cautionCardUploadApiEndpoint: (patientId: string) =>
    `/api/v1/patients/${patientId}/caution-cards`,
};
