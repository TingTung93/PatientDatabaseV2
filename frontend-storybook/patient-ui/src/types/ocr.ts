export enum OcrStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export interface OcrResult {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  status: OcrStatus;
  text: string | null;
  confidence: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  error?: string;
  progress?: number;
}

export interface OcrUploadResponse {
  id: number;
  status: OcrStatus;
  file_name: string;
}

export interface TextAnalysisResult {
  text: string;
  confidence: number;
  entities: {
    type: string;
    text: string;
    confidence: number;
  }[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
}

export interface StructuredData {
  value: string;
  confidence: number;
}

export interface OcrError {
  code: string;
  error: string;
  details?: Record<string, any>;
}

export interface OcrProgressEvent {
  id: number;
  status: OcrStatus;
  progress: number;
  message?: string;
}

export interface OcrFilters {
  status?: OcrStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface OcrPaginatedResponse {
  data: OcrResult[];
  total: number;
  page: number;
  limit: number;
} 