import apiClient from '../api/client'; // Import the configured client

// Remove BASE_URL as it's configured in apiClient

export interface CautionCard {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  patient_id: number | null;
  blood_type: string;
  antibodies: string[];
  transfusion_requirements: string[];
  ocr_text: string;
  metadata: Record<string, any>;
  status: 'pending' | 'reviewed';
  reviewed_date?: string;
  reviewed_by?: string;
  updated_by?: string;
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

export interface CautionCardUploadParams {
  bloodType?: string;
  antibodies?: string[];
  transfusionRequirements?: string[];
}

class CautionCardService {
  async getAllCautionCards(params: CautionCardSearchParams = {}): Promise<PaginatedResponse<CautionCard>> {
    // Use apiClient and relative path
    const response = await apiClient.get(`/caution-cards`, { params });
    return response.data;
  }

  async getOrphanedCautionCards(): Promise<CautionCard[]> {
    const response = await apiClient.get(`/caution-cards/orphaned`);
    return response.data;
  }

  async searchCautionCards(query: string): Promise<CautionCard[]> {
    const response = await apiClient.get(`/caution-cards/search`, { params: { q: query } });
    return response.data;
  }

  async getCautionCardById(id: number): Promise<CautionCard> {
    const response = await apiClient.get(`/caution-cards/${id}`);
    return response.data;
  }

  async processCautionCard(formData: FormData): Promise<CautionCard> {
    // Use apiClient, relative path, and remove manual headers (handled by client or interceptors)
    const response = await apiClient.post(`/caution-cards/process`, formData, {
      headers: {
        // Content-Type is often set automatically by browser for FormData
        // 'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateCautionCard(id: number, data: {
    bloodType?: string;
    antibodies?: string[];
    transfusionRequirements?: string[];
    status?: string;
    patientId?: number;
    ocrText?: string;
    metadata?: Record<string, any>;
  }): Promise<CautionCard> {
    const response = await apiClient.put(`/caution-cards/${id}`, data);
    return response.data;
  }

  async markAsReviewed(id: number, reviewedBy: string): Promise<CautionCard> {
    const response = await apiClient.post(`/caution-cards/${id}/review`, { reviewedBy });
    return response.data;
  }

  async linkToPatient(id: number, patientId: number, updatedBy: string): Promise<CautionCard> {
    const response = await apiClient.post(`/caution-cards/${id}/link`, { patientId, updatedBy });
    return response.data;
  }

  async deleteCautionCard(id: number, updatedBy: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/caution-cards/${id}`, {
      data: { updatedBy }
    });
    return response.data;
  }
}

export const cautionCardService = new CautionCardService(); 