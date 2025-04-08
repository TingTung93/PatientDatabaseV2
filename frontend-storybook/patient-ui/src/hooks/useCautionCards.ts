import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { cautionCardService } from '../services/cautionCardService'; // Corrected path
import { patientService } from '../services/patientService'; // Corrected path
import { CautionCard } from '../types/cautionCard'; // Assuming this type exists
import { PaginatedResponse } from '../types/common'; // Assuming this type exists

// --- Re-using types defined in cautionCardService.ts ---
// If these types were exported from the service, we could import them.
// Otherwise, ensure consistency or define shared types in ../types/
interface GetAllCautionCardsParams {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: number | string;
  dateFrom?: string;
  dateTo?: string;
  reviewed?: boolean;
  unreviewed?: boolean;
}
interface SearchCautionCardsParams {
  q: string;
}
interface ProcessCautionCardUploadData {
  file: File;
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
  metadata?: Record<string, any>;
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
interface CreateResponse {
  id: number | string;
  message?: string;
}
interface DeleteResponse {
  message: string;
}
type LinkPatientResponse = CautionCard;
type MarkReviewedResponse = CautionCard;
// --- End Re-used Types ---

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Centralized query keys
const cautionCardKeys = {
  all: ['cautionCards'] as const,
  lists: () => [...cautionCardKeys.all, 'list'] as const,
  list: (params: GetAllCautionCardsParams | object) =>
    [...cautionCardKeys.lists(), params] as const,
  searches: () => [...cautionCardKeys.all, 'search'] as const,
  search: (params: SearchCautionCardsParams) => [...cautionCardKeys.searches(), params] as const,
  orphaned: () => [...cautionCardKeys.all, 'orphaned'] as const,
  details: () => [...cautionCardKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...cautionCardKeys.details(), String(id)] as const,
  patientCards: (patientId: string | number) =>
    [...cautionCardKeys.all, 'patient', String(patientId)] as const,
};

// Hook for fetching all caution cards (paginated, filtered)
export const useCautionCards = (
  params: GetAllCautionCardsParams = {}
): UseQueryResult<PaginatedResponse<CautionCard>, Error> => {
  return useQuery({
    queryKey: cautionCardKeys.list(params),
    queryFn: () => cautionCardService.getCautionCards(params),
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
  });
};

// Hook for fetching orphaned caution cards
export const useOrphanedCautionCards = (): UseQueryResult<CautionCard[], Error> => {
  return useQuery({
    queryKey: cautionCardKeys.orphaned(),
    // Service function doesn't take pagination params anymore
    queryFn: () => cautionCardService.getOrphanedCards(),
    staleTime: STALE_TIME,
  });
};

// Hook for searching caution cards
export const useSearchCautionCards = (
  params: SearchCautionCardsParams,
  enabled = true
): UseQueryResult<CautionCard[], Error> => {
  return useQuery({
    queryKey: cautionCardKeys.search(params),
    queryFn: () => cautionCardService.searchCautionCards(params),
    enabled: enabled && !!params.q && params.q.length > 0, // Enable only if query exists
    staleTime: STALE_TIME,
  });
};

// Hook for fetching caution cards for a specific patient
export const usePatientCautionCards = (
  patientId: string | number,
  enabled: boolean = true
): UseQueryResult<CautionCard[], Error> => {
  const stringPatientId = String(patientId);
  return useQuery({
    // Use consistent string ID in query key
    queryKey: cautionCardKeys.patientCards(stringPatientId),
    queryFn: () => patientService.getPatientCautionCards(stringPatientId), // Use patientService
    enabled: enabled && !!patientId,
    staleTime: STALE_TIME,
  });
};

// Hook for fetching a single caution card
export const useCautionCard = (
  id: string | number,
  enabled: boolean = true
): UseQueryResult<CautionCard, Error> => {
  const stringId = String(id);
  return useQuery({
    queryKey: cautionCardKeys.detail(stringId),
    queryFn: () => cautionCardService.getCautionCardById(id), // Pass original id
    enabled: enabled && !!id,
    staleTime: STALE_TIME,
  });
};

// Hook for updating a caution card
export const useUpdateCautionCard = (): UseMutationResult<
  CautionCard,
  Error,
  { id: string | number; data: UpdateCautionCardRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateCautionCardRequest }) =>
      cautionCardService.updateCautionCard(id, data), // Pass original id
    onSuccess: updatedCard => {
      const stringId = String(updatedCard.id);
      // Update the specific card cache
      queryClient.setQueryData(cautionCardKeys.detail(stringId), updatedCard);
      // Invalidate lists and potentially patient-specific list
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.orphaned() }); // If status/patientId changed
      if (updatedCard.patient_id) {
        // Check if patient_id exists and is not null/undefined
        queryClient.invalidateQueries({
          queryKey: cautionCardKeys.patientCards(String(updatedCard.patient_id)),
        });
      }
    },
  });
};

// Hook for linking a card to a patient
export const useLinkCautionCardToPatient = (): UseMutationResult<
  LinkPatientResponse,
  Error,
  { id: string | number; data: LinkPatientRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: LinkPatientRequest }) =>
      cautionCardService.linkCautionCardToPatient(id, data), // Pass original id
    onSuccess: (updatedCard, variables) => {
      const stringId = String(variables.id);
      const stringPatientId = String(variables.data.patientId);
      // Update the specific card cache
      queryClient.setQueryData(cautionCardKeys.detail(stringId), updatedCard);
      // Invalidate relevant lists
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.orphaned() });
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.patientCards(stringPatientId) });
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.lists() }); // General list might change
    },
  });
};

// Hook for reviewing a card (marking as reviewed)
export const useMarkCautionCardAsReviewed = (): UseMutationResult<
  MarkReviewedResponse,
  Error,
  { id: string | number; data: MarkReviewedRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: MarkReviewedRequest }) =>
      cautionCardService.markAsReviewed(id, data), // Pass original id
    onSuccess: updatedCard => {
      const stringId = String(updatedCard.id);
      // Update the specific card cache
      queryClient.setQueryData(cautionCardKeys.detail(stringId), updatedCard);
      // Invalidate lists where review status might matter
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.lists() });
      if (updatedCard.patient_id) {
        queryClient.invalidateQueries({
          queryKey: cautionCardKeys.patientCards(String(updatedCard.patient_id)),
        });
      }
    },
  });
};

// Hook for deleting a card
export const useDeleteCautionCard = (): UseMutationResult<
  DeleteResponse,
  Error,
  { id: string | number; data: DeleteCautionCardRequest }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: DeleteCautionCardRequest }) =>
      cautionCardService.deleteCautionCard(id, data), // Pass original id
    onSuccess: (_, variables) => {
      const stringId = String(variables.id);
      // Remove the deleted card from the cache
      queryClient.removeQueries({ queryKey: cautionCardKeys.detail(stringId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.orphaned() });
      // We don't know the patient ID here, so invalidating all lists is safest
    },
  });
};

// Hook to upload/process a caution card file
export const useProcessCautionCard = (): UseMutationResult<
  CreateResponse,
  Error,
  ProcessCautionCardUploadData
> => {
  const queryClient = useQueryClient();
  return useMutation<CreateResponse, Error, ProcessCautionCardUploadData>({
    mutationFn: (data: ProcessCautionCardUploadData) =>
      cautionCardService.processCautionCardUpload(data),
    onSuccess: () => {
      // Invalidate lists as a new card (likely orphaned initially) was added
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cautionCardKeys.orphaned() });
    },
  });
};
