import client from './client'; // Use default import
import { CautionCard } from '../types/cautionCard'; // Correct path
import { PaginatedResponse } from '../types/common'; // Correct path
// Define CautionCard type later based on API or ../types
// import { CautionCard } from '../types/CautionCard';

// Interface for paginated response
interface PaginatedCardsResponse {
  data: CautionCard[]; // Replace any with CautionCard
  total: number;
  page: number;
  limit: number;
}

interface LinkCardBody {
  patientId: string | number;
  updatedBy: string;
}

interface ReviewCardBody {
  reviewedBy: string;
}

interface DeleteCardBody {
  updatedBy: string;
}

interface LinkCardParams {
  cardId: string;
  patientId: string;
  updatedBy: string;
}

interface DeleteCardParams {
  id: string;
  updatedBy: string;
}

interface ReviewCardParams {
  id: string;
  updatedBy: string;
  notes?: string;
}

export const cautionCardService = {
  /**
   * Fetches a paginated list of caution cards.
   * GET /caution-cards
   */
  getCautionCards: async (
    page = 1,
    limit = 10,
    filters = {}
  ): Promise<PaginatedResponse<CautionCard>> => {
    const response = await client.get('/caution-cards', {
      params: { page, limit, ...filters },
    });
    return response.data;
  },

  /**
   * Fetches orphaned caution cards.
   * GET /caution-cards/orphaned
   */
  getOrphanedCards: async (page = 1, limit = 10): Promise<PaginatedResponse<CautionCard>> => {
    const response = await client.get('/caution-cards/orphaned', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Searches caution cards.
   * GET /caution-cards/search
   */
  searchCautionCards: async (query: string): Promise<CautionCard[]> => {
    // Replace any with CautionCard
    const response = await client.get<CautionCard[]>('/caution-cards/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Fetches a single caution card by ID.
   * GET /caution-cards/:id
   */
  getCautionCardById: async (id: string): Promise<CautionCard> => {
    const response = await client.get<CautionCard>(`/caution-cards/${id}`);
    return response.data;
  },

  /**
   * Updates a caution card.
   * PUT /caution-cards/:id
   */
  updateCautionCard: async (
    id: string | number,
    cardData: Record<string, unknown>
  ): Promise<CautionCard> => {
    // Replace any with CautionCard
    const response = await client.put<CautionCard>(`/caution-cards/${id}`, cardData);
    return response.data;
  },

  /**
   * Links a caution card to a patient.
   * POST /caution-cards/:id/link
   */
  linkCardToPatient: async ({
    cardId,
    patientId,
    updatedBy,
  }: LinkCardParams): Promise<CautionCard> => {
    const response = await client.post<CautionCard>(`/caution-cards/${cardId}/link`, {
      patientId,
      updatedBy,
    });
    return response.data;
  },

  /**
   * Unlinks a caution card from a patient.
   * POST /caution-cards/:id/unlink
   */
  unlinkCardFromPatient: async ({
    cardId,
    updatedBy,
  }: Omit<LinkCardParams, 'patientId'>): Promise<CautionCard> => {
    const response = await client.post<CautionCard>(`/caution-cards/${cardId}/unlink`, {
      updatedBy,
    });
    return response.data;
  },

  /**
   * Marks a caution card as reviewed.
   * POST /caution-cards/:id/review
   */
  reviewCard: async ({ id, updatedBy, notes }: ReviewCardParams): Promise<CautionCard> => {
    const response = await client.post<CautionCard>(`/caution-cards/${id}/review`, {
      updatedBy,
      notes,
    });
    return response.data;
  },

  /**
   * Deletes a caution card.
   * DELETE /caution-cards/:id
   */
  deleteCard: async ({ id, updatedBy }: DeleteCardParams): Promise<void> => {
    await client.delete(`/caution-cards/${id}`, {
      data: { updatedBy },
    });
  },

  // Note: The caution card upload/process function (POST /caution-cards/process)
  // is handled in uploadService.ts
};
