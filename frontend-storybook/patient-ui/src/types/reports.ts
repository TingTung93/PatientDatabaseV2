export enum ReportStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ReportType {
  GENERAL = 'general',
  LAB = 'lab',
  IMAGING = 'imaging',
  SURGERY = 'surgery',
  CONSULTATION = 'consultation',
}

export interface Report {
  id: number;
  title: string;
  content: string;
  report_type: ReportType;
  status: ReportStatus;
  patient_id: number;
  created_at: string;
  updated_at: string;
  attachments?: ReportAttachment[];
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

export interface ReportAttachment {
  id: number;
  filename: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface ReportsResponse {
  data: Report[];
  total: number;
  page: number;
  limit: number;
}
