import apiClient from './apiClient';
import { CautionCard } from '../types/cautionCard'; // Assuming this type exists
import { PaginatedResponse } from '../types/common'; // Assuming this type exists

// Define simple response types if not in common types
interface DeleteResponse {
  message: string;
}
interface CreateResponse {
  // Assuming upload returns the created object or just an ID/message
  id: number | string; // Adjust based on actual API response
  message?: string;
}
// Link response for caution card might return the updated card itself
type LinkPatientResponse = CautionCard;
type MarkReviewedResponse = CautionCard;

// Define request parameter/body types based on API documentation
interface GetAllCautionCardsParams {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: number | string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  reviewed?: boolean;
  unreviewed?: boolean;
}

interface SearchCautionCardsParams {
  q: string; // Search term
}

interface ProcessCautionCardUploadData {
  file: File;
  patientId?: string; // Made optional since it's not needed for initial processing
  bloodType?: string;
  antibodies?: string[];
  transfusionRequirements?: string[];
}

interface UpdateCautionCardRequest {
  bloodType?: string;
  antibodies?: string[];
  transfusionRequirements?: string[];
  status?: string;
  patientId?: number | string;
  ocrText?: string;
  metadata?: Record<string, any>; // Or a more specific type if known
}

interface MarkReviewedRequest {
  reviewedBy: string;
}

interface LinkPatientRequest {
  patientId: number | string;
  updatedBy: string;
}

interface DeleteCautionCardRequest {
  updatedBy: string;
}

const CAUTION_CARD_BASE_URL = '/caution-cards'; // Removed /api/v1 prefix
const PATIENT_BASE_URL = '/patients'; // Removed /api/v1 prefix

export const cautionCardService = {
  // Get all caution cards with filtering
  getCautionCards: async (
    params?: GetAllCautionCardsParams
  ): Promise<PaginatedResponse<CautionCard>> => {
    const response = await apiClient.get<PaginatedResponse<CautionCard>>(CAUTION_CARD_BASE_URL, { params });
    return response.data;
  },

  // Get orphaned cards (not linked to a patient)
  getOrphanedCards: async (): Promise<CautionCard[]> => {
    const response = await apiClient.get<CautionCard[]>(`${CAUTION_CARD_BASE_URL}/orphaned`);
    return response.data;
  },

  // Search caution cards
  searchCautionCards: async (params: SearchCautionCardsParams): Promise<CautionCard[]> => {
    // API doc implies list response, not paginated, confirm if needed
    const response = await apiClient.get<CautionCard[]>(`${CAUTION_CARD_BASE_URL}/search`, { params });
    return response.data;
  },

  // Get a single caution card by ID
  getCautionCardById: async (id: string | number): Promise<CautionCard> => {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid caution card ID: ${id}. Must be a number.`);
    }
    console.log('Calling API getCautionCardById with caution card ID:', id, typeof id); // Temporary logging
    const response = await apiClient.get<CautionCard>(`${CAUTION_CARD_BASE_URL}/${id}`);
    return response.data;
  },

  // Process uploaded caution card file
  processCautionCardUpload: async (data: ProcessCautionCardUploadData): Promise<CreateResponse> => {
    const formData = new FormData();
    formData.append('file', data.file);
    
    // Process the caution card first without linking to patient
    const response = await apiClient.post<CreateResponse>(`${CAUTION_CARD_BASE_URL}/process`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Update caution card details
  updateCautionCard: async (
    id: string | number,
    data: UpdateCautionCardRequest
  ): Promise<CautionCard> => {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid caution card ID: ${id}. Must be a number.`);
    }
    console.log('Calling API updateCautionCard with caution card ID:', id, typeof id); // Temporary logging
    const response = await apiClient.put<CautionCard>(`${CAUTION_CARD_BASE_URL}/${id}`, data);
    return response.data;
  },

  // Mark a caution card as reviewed
  markAsReviewed: async (
    id: string | number,
    data: MarkReviewedRequest
  ): Promise<MarkReviewedResponse> => {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid caution card ID: ${id}. Must be a number.`);
    }
    console.log('Calling API markAsReviewed with caution card ID:', id, typeof id); // Temporary logging
    const response = await apiClient.post<MarkReviewedResponse>(`${CAUTION_CARD_BASE_URL}/${id}/review`, data);
    return response.data;
  },

  // Link a caution card to a patient
  linkCautionCardToPatient: async (
    id: string | number,
    data: LinkPatientRequest
  ): Promise<LinkPatientResponse> => {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid caution card ID: ${id}. Must be a number.`);
    }
    console.log('Calling API linkCautionCardToPatient with caution card ID:', id, typeof id); // Temporary logging
    const response = await apiClient.post<LinkPatientResponse>(`${CAUTION_CARD_BASE_URL}/${id}/link`, data);
    return response.data;
  },

  // Delete a caution card
  deleteCautionCard: async (
    id: string | number,
    data: DeleteCautionCardRequest
  ): Promise<DeleteResponse> => {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid caution card ID: ${id}. Must be a number.`);
    }
    console.log('Calling API deleteCautionCard with caution card ID:', id, typeof id); // Temporary logging
    // Note: DELETE request has a body according to docs
    const response = await apiClient.delete<DeleteResponse>(`${CAUTION_CARD_BASE_URL}/${id}`, { data });
    return response.data;
  },
};
