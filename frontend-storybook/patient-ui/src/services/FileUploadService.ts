import { apiClient } from '../api/apiClient'; // Import apiClient
import { FileTypeCategory } from './FileValidationService';
import { AxiosProgressEvent } from 'axios'; // Import Axios type

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  success: boolean;
  message?: string;
  fileUrl?: string; // URL of the uploaded file, if successful
}

/**
 * Service for handling file uploads to the backend API using the centralized apiClient.
 */
export class FileUploadService {
  private static instance: FileUploadService;

  private constructor() {}

  /**
   * Gets the singleton instance of the FileUploadService.
   * @returns {FileUploadService} The singleton instance.
   */
  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Uploads a file to the appropriate backend endpoint using apiClient.
   *
   * @param {File} file - The file to upload.
   * @param {FileTypeCategory} category - The category of the file (Report or CautionCard).
   * @param {string | null} patientId - The ID of the patient associated with the file.
   * @param {(progress: UploadProgress) => void} [onProgress] - Optional callback for upload progress updates.
   * @returns {Promise<UploadResult>} A promise resolving with the upload result.
   */
  public async uploadFile(
    file: File,
    category: FileTypeCategory,
    patientId: string | null,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Determine the relative endpoint path based on config structure
    const endpointPath =
      category === FileTypeCategory.Report
        ? 'reports/upload' // Always use the dedicated upload endpoint for reports
        : patientId ? `patients/${patientId}/caution-cards` : 'caution-cards/process'; // Use process endpoint for non-patient-linked cards

    const formData = new FormData();
    // Use the correct field name based on the category
    const fileFieldName = category === FileTypeCategory.Report ? 'report' : 'file';
    formData.append(fileFieldName, file);

    // Append patient_id only if it exists and category is not Report
    // (Assuming reports don't need patient_id directly in this FormData)
    if (patientId && category !== FileTypeCategory.Report) {
      formData.append('patient_id', patientId);
    }
    // Add report type for reports
    if (category === FileTypeCategory.Report) {
      formData.append('type', file.type); // Use the file's MIME type as the report type
    }

    try {
      const response = await apiClient.post(
        endpointPath,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (onProgress && progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress({
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percent: percent,
              });
            } else if (onProgress) {
              onProgress({ loaded: progressEvent.loaded, total: 0, percent: 0 });
            }
          },
        }
      );

      // Axios automatically throws for non-2xx status codes,
      // which should be handled by the response interceptor in apiClient.ts

      return {
        success: true,
        message: 'File uploaded successfully.',
        fileUrl: response.data?.fileUrl, // Access data from Axios response
      };
    } catch (error: unknown) {
      // Error handling is largely managed by the apiClient interceptor,
      // but we can still catch specific errors here if needed or log them.
      console.error('Error during file upload via apiClient:', error);

      // Extract a meaningful message if possible, otherwise use a generic one.
      // The interceptor might have already logged details or redirected.
      const message = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message 
        || 'An unknown error occurred during upload.';

      // Reset progress on error
      if (onProgress) {
        // Use file.size as total if available, otherwise 0
        const totalSize = file ? file.size : 0;
        onProgress({ loaded: 0, total: totalSize, percent: 0 });
      }

      return { success: false, message };
    }
  }
}

// Export a singleton instance for easy use
export const fileUploadService = FileUploadService.getInstance();
