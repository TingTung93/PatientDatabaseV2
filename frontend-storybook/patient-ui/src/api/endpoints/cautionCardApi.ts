import { AxiosResponse } from 'axios';
import { apiClient } from '../apiClient';
import { Patient } from '../../types/patient';

export interface CautionCardUploadRequest {
  patientId: string;
  cautionFlags: string[];
  notes?: string;
}

export interface CautionCardFileUploadRequest {
  file: File;
  patientId?: string;
  notes?: string;
}

export interface CautionCardResponse {
  success: boolean;
  message: string;
  patient: Patient;
}

export interface CautionCardFileUploadResponse {
  success: boolean;
  message: string;
  cardId: string;
}

const CAUTION_CARD_BASE_URL = '/api/v1/caution-cards';

export const cautionCardApi = {
  /**
   * Upload a caution card file
   */
  uploadCautionCardFile: async (request: CautionCardFileUploadRequest): Promise<AxiosResponse<CautionCardFileUploadResponse>> => {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.patientId) {
      formData.append('patientId', request.patientId);
    }
    if (request.notes) {
      formData.append('notes', request.notes);
    }
    return apiClient.post(`${CAUTION_CARD_BASE_URL}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Upload new caution card information for a patient
   */
  uploadCautionCard: async (request: CautionCardUploadRequest): Promise<AxiosResponse<CautionCardResponse>> => {
    return apiClient.post(`${CAUTION_CARD_BASE_URL}/upload`, request);
  },

  /**
   * Update existing caution card information
   */
  updateCautionCard: async (patientId: string, request: CautionCardUploadRequest): Promise<AxiosResponse<CautionCardResponse>> => {
    return apiClient.put(`${CAUTION_CARD_BASE_URL}/${patientId}`, request);
  },

  /**
   * Delete caution card information
   */
  deleteCautionCard: async (patientId: string): Promise<AxiosResponse<CautionCardResponse>> => {
    return apiClient.delete(`${CAUTION_CARD_BASE_URL}/${patientId}`);
  },

  /**
   * Get caution card information for a patient
   */
  getCautionCard: async (patientId: string): Promise<AxiosResponse<CautionCardResponse>> => {
    return apiClient.get(`${CAUTION_CARD_BASE_URL}/${patientId}`);
  }
}; 