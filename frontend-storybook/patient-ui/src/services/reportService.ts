import apiClient from './apiClient';
import { Report } from '../types/report'; // Assuming Report type exists
import { PaginatedResponse } from '../types/common'; // Assuming this type exists

// Define simple response types based on API documentation if not in common types
interface DeleteResponse {
  message: string;
}
interface CreateResponse {
  // Assuming upload/add attachment returns the created object or just an ID/message
  id: number | string; // Adjust based on actual API response
  message?: string;
}
interface Attachment {
  // Define a basic Attachment type if not present
  id: number | string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  // Add other relevant fields if needed
}

// Define request parameter/body types based on API documentation
interface GetAllReportsParams {
  page?: number;
  limit?: number;
  type?: string;
  patientId?: number | string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
}

interface UpdateReportRequest {
  type?: string;
  patientId?: number | string;
  ocrText?: string;
  status?: string; // e.g., "completed", "pending"
  metadata?: Record<string, any>; // Or a more specific type if known
}

interface UpdateReportStatusRequest {
  status: string; // e.g., "completed", "pending"
  updatedBy: string;
}

const BASE_URL = '/reports';

export const reportService = {
  // Get all reports with pagination and filtering
  getAllReports: async (params?: GetAllReportsParams): Promise<PaginatedResponse<Report>> => {
    const response = await apiClient.get<PaginatedResponse<Report>>(BASE_URL, { params });
    return response.data;
  },

  // Get a single report by ID
  getReportById: async (id: string | number): Promise<Report> => {
    const response = await apiClient.get<Report>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Upload a new report file
  uploadReport: async (
    file: File,
    type: string,
    patientId?: number | string
  ): Promise<CreateResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (patientId) {
      formData.append('patientId', String(patientId));
    }

    const response = await apiClient.post<CreateResponse>(`${BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update an existing report's details
  updateReport: async (id: string | number, reportData: UpdateReportRequest): Promise<Report> => {
    const response = await apiClient.put<Report>(`${BASE_URL}/${id}`, reportData);
    return response.data;
  },

  // Update the status of a report
  updateReportStatus: async (
    id: string | number,
    statusData: UpdateReportStatusRequest
  ): Promise<Report> => {
    const response = await apiClient.put<Report>(`${BASE_URL}/${id}/status`, statusData);
    return response.data;
  },

  // Get attachments for a specific report
  getReportAttachments: async (id: string | number): Promise<Attachment[]> => {
    const response = await apiClient.get<Attachment[]>(`${BASE_URL}/${id}/attachments`);
    return response.data;
  },

  // Add an attachment to a report
  addReportAttachment: async (id: string | number, file: File): Promise<CreateResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<CreateResponse>(
      `${BASE_URL}/${id}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Delete a specific report attachment
  deleteReportAttachment: async (attachmentId: string | number): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `${BASE_URL}/attachments/${attachmentId}`
    );
    return response.data;
  },

  // Delete a report
  deleteReport: async (id: string | number): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
