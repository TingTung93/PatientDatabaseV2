// Types for Caution Card data and operations
import { PaginatedResponse } from './common'; // Import PaginatedResponse

export interface CautionCard {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  patient_id?: number;
  blood_type?: string;
  antibodies: string[];
  transfusion_requirements: string[];
  ocr_text?: string;
  metadata: Record<string, unknown>;
  status: 'pending' | 'reviewed';
  reviewed_date?: string;
  reviewed_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CautionCardUploadData {
  file: File;
  bloodType?: string;
  antibodies?: string[];
  transfusionRequirements?: string[];
}

export interface CautionCardUpdateData extends Record<string, unknown> {
  bloodType?: string;
  antibodies?: string[];
  transfusionRequirements?: string[];
  status?: 'reviewed';
  patientId?: number;
  ocrText?: string;
  metadata?: Record<string, unknown>;
}

export interface CautionCardSearchParams {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: number;
  dateFrom?: string;
  dateTo?: string;
  reviewed?: boolean;
  unreviewed?: boolean;
}

// Response type for fetching caution cards (likely paginated)
export type GetCautionCardsResponse = PaginatedResponse<CautionCard>;
