import { apiClient } from './apiClient';

export interface Report {
  id: string | number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface GetReportsResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportApiFilters {
  status?: Report['status'];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export const getReports = async (
  filters?: ReportApiFilters,
  page: number = 1,
  limit: number = 10
): Promise<GetReportsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.startDate && { startDate: filters.startDate }),
    ...(filters?.endDate && { endDate: filters.endDate }),
    ...(filters?.searchTerm && { search: filters.searchTerm }),
  });

  const response = await apiClient.get<GetReportsResponse>(`/reports?${params}`);
  return response.data;
};

export const deleteReport = async (reportId: string | number): Promise<void> => {
  await apiClient.delete(`/reports/${reportId}`);
};
