// import axios from 'axios'; // No longer used directly
import apiClient from '../api/client'; // Import the central API client

// const BASE_URL = 'http://localhost:5000/api'; // Base URL is handled by apiClient

export interface Report {
  id: number;
  type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  patient_id: number | null;
  ocr_text: string;
  metadata: Record<string, unknown>; // Use unknown instead of any
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface ReportSearchParams {
  page?: number;
  limit?: number;
  type?: string;
  patientId?: number;
  dateFrom?: string;
  dateTo?: string;
}

class ReportService {
  async getAllReports(params: ReportSearchParams = {}): Promise<PaginatedResponse<Report>> {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  }

  async getReportById(id: number): Promise<Report> {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  }

  async uploadReport(formData: FormData): Promise<Report> {
    // Use apiClient for the request, ensuring auth headers are added
    // The endpoint is relative to the apiClient's baseURL
    const response = await apiClient.post('/reports/upload', formData, {
      headers: {
        // Explicitly set Content-Type for FormData, overriding apiClient default
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateReport(id: number, data: {
    type?: string;
    patientId?: number;
    ocrText?: string;
    status?: string;
    metadata?: Record<string, unknown>; // Use unknown instead of any
  }): Promise<Report> {
    const response = await apiClient.put(`/reports/${id}`, data);
    return response.data;
  }

  async updateReportStatus(id: number, status: string, updatedBy: string): Promise<Report> {
    const response = await apiClient.put(`/reports/${id}/status`, { status, updatedBy });
    return response.data;
  }

  async getReportAttachments(id: number): Promise<unknown[]> { // Use unknown[] instead of any[]
    const response = await apiClient.get(`/reports/${id}/attachments`);
    return response.data;
  }

  async addReportAttachment(id: number, formData: FormData): Promise<unknown> { // Use unknown instead of any
    const response = await apiClient.post(`/reports/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Keep header override for FormData
      },
    });
    return response.data;
  }

  async deleteReportAttachment(attachmentId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/reports/attachments/${attachmentId}`);
    return response.data;
  }

  async deleteReport(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  }
}

export const reportService = new ReportService(); 