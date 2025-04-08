import axios from 'axios';
import { apiClient } from '../api/apiClient'; // Import the shared client
import { OcrResult, OcrUploadResponse, OcrFilters, OcrPaginatedResponse } from '../types/ocr';
import environment from '../config/environment';

const BASE_URL = `${environment.api.baseUrl}/ocr`;

// Validate file before upload
const validateFile = (file: File): string | null => {
  if (file.size > environment.security.maxFileSize) {
    return `File size exceeds maximum allowed size of ${environment.security.maxFileSize / 1024 / 1024}MB`;
  }

  if (!environment.security.allowedFileTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed. Allowed types: ${environment.security.allowedFileTypes.join(', ')}`;
  }

  return null;
};


export const ocrService = {
  // Upload a file for OCR processing
  uploadFile: async (file: File, onUploadProgress?: (progress: number) => void): Promise<OcrUploadResponse> => {
    // Validate file before upload
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post<OcrUploadResponse>(`${BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // CSRF token should be handled by apiClient interceptor if configured
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
             const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
             onUploadProgress?.(percentCompleted);
          }
        },
      });
      return response.data; // Return data directly
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message || 'Upload failed');
      }
      throw error; // Re-throw other errors
    }
  },

  // Get OCR result by ID
  getResult: async (id: number): Promise<OcrResult> => {
    try {
      const response = await apiClient.get<OcrResult>(`${BASE_URL}/results/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch OCR result');
      }
      throw error;
    }
  },

  // Get paginated OCR results with optional filters
  getResults: async (
    page: number = 1,
    limit: number = 10,
    filters?: OcrFilters
  ): Promise<OcrPaginatedResponse> => {
    try {
      const params = {
        page,
        limit,
        ...filters,
      };

      const response = await apiClient.get<OcrPaginatedResponse>(`${BASE_URL}/results`, {
        params,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch OCR results');
      }
      throw error;
    }
  },

  // Delete an OCR result
  deleteResult: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`${BASE_URL}/results/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message || 'Failed to delete OCR result');
      }
      throw error;
    }
  },

  // Retry failed OCR processing
  retryProcessing: async (id: number): Promise<OcrUploadResponse> => {
    try {
      const response = await apiClient.post<OcrUploadResponse>(`${BASE_URL}/results/${id}/retry`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message || 'Failed to retry OCR processing');
      }
      throw error;
    }
  },
}; 