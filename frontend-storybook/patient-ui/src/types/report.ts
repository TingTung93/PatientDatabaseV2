export interface ReportAttachment {
  id: number | string;
  name: string;
  uploaded_at: string;
  size?: number;
  type?: string;
  url?: string;
}

// Define ReportStatus first so it can be used in Report interface
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Report {
  id: number | string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: ReportStatus; // Use the defined type alias
  created_at: string;
  updated_at: string;
  patient_id?: number | string | null; // Added based on API doc/usage
  metadata?: Record<string, any>;
  attachments?: ReportAttachment[];
  title?: string; // Optional title
  content?: string; // Optional content (e.g., OCR text)
  report_type?: string; // Optional type string
}

export interface ReportCreateRequest {
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  metadata?: Record<string, any>;
  title?: string;
  content?: string;
  report_type?: string;
}

export interface ReportUpdateRequest {
  id: number | string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  status?: ReportStatus; // Use the defined type alias
  metadata?: Record<string, any>;
  title?: string;
  content?: string;
  report_type?: string;
}

export interface ReportFilterOptions {
  status?: ReportStatus; // Use the defined type alias
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface GetReportResponse {
  data: Report;
}

export interface GetReportsResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}

// ReportType seems less used/defined in API doc examples, keeping simple for now
export type ReportType = 'general' | 'lab' | 'imaging' | 'surgery' | 'consultation' | string;
// Removed duplicate ReportStatus definition
