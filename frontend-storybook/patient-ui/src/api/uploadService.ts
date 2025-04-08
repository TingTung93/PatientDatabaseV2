import apiClient from './client';

// Define response types later based on API or ../types
// import { Report } from '../types/Report';
// import { CautionCard } from '../types/CautionCard';

interface UploadReportResponse { /* Define based on API response for POST /reports/upload */ id: string | number; /* ...other fields */ }
interface ProcessCardResponse { /* Define based on API response for POST /caution-cards/process */ id: string | number; /* ...other fields */ }

export const uploadService = {
  /**
   * Uploads a report file with metadata.
   * POST /reports/upload
   */
  uploadReport: async ({ file, type, patientId }: { 
    file: File;
    type: string; 
    patientId?: string | number | null; 
  }): Promise<UploadReportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (patientId) {
      formData.append('patientId', String(patientId)); // Ensure patientId is sent as string if needed
    }

    const response = await apiClient.post<UploadReportResponse>('/reports/upload', formData, {
      headers: {
        // Axios typically sets Content-Type automatically for FormData
        // 'Content-Type': 'multipart/form-data',
      },
      // Optional: Add progress tracking here if needed
    });
    return response.data;
  },

  /**
   * Uploads a caution card file for processing (simplified version).
   * POST /caution-cards/process
   */
  uploadCautionCard: async (file: File): Promise<ProcessCardResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // No optional fields needed based on simplified creative design

    const response = await apiClient.post<ProcessCardResponse>('/caution-cards/process', formData, {
      headers: {
        // Axios typically sets Content-Type automatically for FormData
        // 'Content-Type': 'multipart/form-data',
      },
       // Optional: Add progress tracking here if needed
    });
    return response.data;
  },
  
  // Original uploadCautionCard with options (if needed later or for reference)
  /*
  uploadCautionCardWithOptions: async ({ file, options }: { 
    file: File; 
    options: { 
      bloodType?: string; 
      antibodies?: string[]; 
      transfusionRequirements?: string[]; 
    }
  }): Promise<ProcessCardResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    // Append optional fields if they exist
    if (options.bloodType) formData.append('bloodType', options.bloodType);
    if (options.antibodies && options.antibodies.length > 0) {
      // API docs example used JSON stringify, confirm if needed
      formData.append('antibodies', JSON.stringify(options.antibodies)); 
    }
    if (options.transfusionRequirements && options.transfusionRequirements.length > 0) {
      // API docs example used JSON stringify, confirm if needed
      formData.append('transfusionRequirements', JSON.stringify(options.transfusionRequirements));
    }

    const response = await apiClient.post<ProcessCardResponse>('/caution-cards/process', formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
  */
}; 