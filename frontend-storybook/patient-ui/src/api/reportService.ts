import apiClient from './client';
import { Report } from '../types/report'; // Correct path
import { PaginatedResponse } from '../types/common'; // Correct path
// Define Report and ReportAttachment types later based on API or ../types
// import { Report, ReportAttachment } from '../types/Report';

// Interface for paginated response (adjust based on actual API response structure)
interface PaginatedReportsResponse {
  // reports: Report[];
  data: any[]; // Replace any with Report later
  total: number;
  page: number;
  limit: number;
  // Add other pagination fields as provided by the API
}

export const reportService = {
  /**
   * Fetches a paginated list of reports.
   * GET /reports
   */
  getReports: async (page = 1, limit = 10, filters = {}): Promise<PaginatedResponse<Report>> => {
    // TODO: Add actual filter params
    const response = await apiClient.get('/reports', { params: { page, limit, ...filters } });
    return response.data;
  },

  /**
   * Fetches a single report by ID.
   * GET /reports/:id
   */
  getReport: async (id: string | number): Promise<any> => {
    // Replace any with Report
    const response = await apiClient.get<any>(`/reports/${id}`);
    return response.data;
  },

  /**
   * Updates a report.
   * PUT /reports/:id
   */
  updateReport: async (id: string | number, reportData: Record<string, any>): Promise<any> => {
    // Replace any with Report
    const response = await apiClient.put<any>(`/reports/${id}`, reportData);
    return response.data;
  },

  /**
   * Updates the status of a report.
   * PUT /reports/:id/status
   */
  updateReportStatus: async (
    id: string | number,
    statusData: { status: string; updatedBy: string }
  ): Promise<any> => {
    // Replace any with Report
    const response = await apiClient.put<any>(`/reports/${id}/status`, statusData);
    return response.data;
  },

  /**
   * Deletes a report by ID.
   * DELETE /reports/:id
   */
  deleteReport: async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/reports/${id}`);
    return response.data;
  },

  /**
   * Fetches attachments for a report.
   * GET /reports/:id/attachments
   */
  getReportAttachments: async (id: string | number): Promise<any[]> => {
    // Replace any with ReportAttachment
    const response = await apiClient.get<any[]>(`/reports/${id}/attachments`);
    return response.data;
  },

  /**
   * Adds an attachment to a report (using FormData).
   * POST /reports/:id/attachments
   */
  addReportAttachment: async (id: string | number, file: File): Promise<any> => {
    // Replace any with ReportAttachment
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<any>(`/reports/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Deletes a report attachment.
   * DELETE /reports/attachments/:attachmentId
   */
  deleteReportAttachment: async (attachmentId: string | number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/reports/attachments/${attachmentId}`
    );
    return response.data;
  },

  // Note: The report upload function itself (POST /reports/upload) is typically placed
  // in a separate uploadService as it handles FormData differently.

  getReportsByPatient: async (
    patientId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Report>> => {
    const response = await apiClient.get(`/patients/${patientId}/reports`, {
      params: { page, limit },
    });
    return response.data;
  },

  getReportById: async (reportId: string): Promise<Report> => {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data;
  },

  deleteReportById: async (reportId: string): Promise<void> => {
    await apiClient.delete(`/reports/${reportId}`);
  },
};
