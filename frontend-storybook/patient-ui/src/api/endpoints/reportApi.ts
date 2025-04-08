import { apiClient } from '../apiClient';
import { Report, ReportCreateRequest, ReportUpdateRequest, ReportFilterOptions } from '../../types/report';

// Base API path for reports
const REPORTS_API = '/api/v1/reports';

/**
 * API client functions for managing reports
 */
export const reportApi = {
  /**
   * Get all reports with optional filtering
   */
  getAllReports: async (filters?: ReportFilterOptions): Promise<Report[]> => {
    const params = filters ?? {};
    const response = await apiClient.get(REPORTS_API, { params });
    return response.data;
  },

  /**
   * Get reports for a specific patient
   */
  getPatientReports: async (patientId: string): Promise<Report[]> => {
    const response = await apiClient.get(`/api/v1/patients/${patientId}/reports`);
    return response.data;
  },

  /**
   * Get a specific report by ID
   */
  getReportById: async (reportId: string): Promise<Report> => {
    const response = await apiClient.get(`${REPORTS_API}/${reportId}`);
    return response.data;
  },

  /**
   * Create a new report
   */
  createReport: async (report: ReportCreateRequest): Promise<Report> => {
    const response = await apiClient.post(REPORTS_API, report);
    return response.data;
  },

  /**
   * Update an existing report
   */
  updateReport: async (reportId: string, updates: ReportUpdateRequest): Promise<Report> => {
    const response = await apiClient.put(`${REPORTS_API}/${reportId}`, updates);
    return response.data;
  },

  /**
   * Delete a report
   */
  deleteReport: async (reportId: string): Promise<void> => {
    await apiClient.delete(`${REPORTS_API}/${reportId}`);
  },

  /**
   * Upload an attachment to a report
   */
  uploadAttachment: async (reportId: string, file: File): Promise<Report> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      `${REPORTS_API}/${reportId}/attachments`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },

  /**
   * Delete an attachment from a report
   */
  deleteAttachment: async (reportId: string, attachmentId: string): Promise<void> => {
    await apiClient.delete(`${REPORTS_API}/${reportId}/attachments/${attachmentId}`);
  }
}; 