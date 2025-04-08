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
   * @param {string} patientId - The ID of the patient associated with the file.
   * @param {(progress: UploadProgress) => void} [onProgress] - Optional callback for upload progress updates.
   * @returns {Promise<UploadResult>} A promise resolving with the upload result.
   */
  public async uploadFile(
    file: File,
    category: FileTypeCategory,
    patientId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    // Determine the relative endpoint path based on config structure
    // Assuming config structure remains similar for path generation
    const endpointPath =
      category === FileTypeCategory.Report
        ? `/api/v1/patients/${patientId}/reports` // Use relative path
        : `/patients/${patientId}/caution-cards`; // Use relative path (removed /api/v1 prefix)

    const formData = new FormData();
    formData.append('file', file); // Assuming the backend expects the file under the key 'file'

    try {
      const response = await apiClient.post(
        endpointPath, // Use the relative path
        formData, // Send FormData as the body
        {
          // Axios config for upload progress and content type
          headers: {
            // Let Axios handle Content-Type for FormData automatically
            // It will set it to 'multipart/form-data' with the correct boundary
            // 'Content-Type': 'multipart/form-data', // Remove this line
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
              // Handle cases where total might not be available initially
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
    } catch (error: any) {
      // Error handling is largely managed by the apiClient interceptor,
      // but we can still catch specific errors here if needed or log them.
      console.error('Error during file upload via apiClient:', error);

      // Extract a meaningful message if possible, otherwise use a generic one.
      // The interceptor might have already logged details or redirected.
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'An unknown error occurred during upload.';

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
