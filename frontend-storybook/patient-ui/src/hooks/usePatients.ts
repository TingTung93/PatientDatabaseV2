import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { patientService } from '../services/patientService';
import {
  PatientSearchParams,
  CreatePatientRequest,
  UpdatePatientRequest,
  Patient,
} from '../types/patient';
import { PaginatedResponse } from '../types/common';
export type { UpdatePatientRequest };
import type { FilterCriteria } from '../components/search/FilterBar';
import { useEffect } from 'react';

// Define simple response types if not imported/available globally
interface DeleteResponse {
  message: string;
}

// Cache time constants
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

// Adjusted MutationContext to allow undefined for cached data
interface MutationContext {
  previousPatients?: PaginatedResponse<Patient> | undefined;
  previousPatient?: Patient | undefined;
}

// Hook to fetch a paginated list of patients
export const usePatients = (
  page: number,
  limit: number,
  filters?: FilterCriteria
): UseQueryResult<PaginatedResponse<Patient>, Error> => {
  const queryClient = useQueryClient();

  // Construct params object safely, mapping FilterCriteria to PatientSearchParams
  const params: PatientSearchParams = {
    page,
    limit,
    // Use 'name' if 'query' is not in PatientSearchParams, based on API doc (query or name)
    ...(filters?.searchTerm && { name: filters.searchTerm }),
    ...(filters?.bloodType && { bloodType: filters.bloodType }),
    ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters?.dateTo && { dateTo: filters.dateTo }),
  };

  const queryResult = useQuery<PaginatedResponse<Patient>, Error>({
    queryKey: ['patients', params],
    queryFn: () => patientService.getPatients(params),
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });

  // Prefetching logic using useEffect
  useEffect(() => {
    const prefetchNextPage = async (nextPage: number) => {
      if (nextPage <= 0) return;
      const nextParams: PatientSearchParams = { ...params, page: nextPage };
      await queryClient.prefetchQuery({
        queryKey: ['patients', nextParams],
        queryFn: () => patientService.getPatients(nextParams),
        staleTime: STALE_TIME,
      });
    };

    if (queryResult.data) {
      const totalPatients = typeof queryResult.data.total === 'number' ? queryResult.data.total : 0;
      const totalPages = limit > 0 ? Math.ceil(totalPatients / limit) : 0;
      if (page < totalPages) {
        prefetchNextPage(page + 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryResult.data, page, limit, filters, queryClient]);

  return queryResult;
};

// Hook to fetch a single patient by ID
export const usePatient = (id: string | number): UseQueryResult<Patient, Error> => {
  return useQuery<Patient, Error>({
    queryKey: ['patient', id],
    queryFn: () => patientService.getPatientById(String(id)),
    enabled: !!id,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
};

// Hook to create a new patient
export const useCreatePatient = (): UseMutationResult<
  Patient,
  Error,
  CreatePatientRequest,
  MutationContext
> => {
  const queryClient = useQueryClient();

  return useMutation<Patient, Error, CreatePatientRequest, MutationContext>({
    mutationFn: patientService.createPatient,
    onMutate: async (_newPatient: CreatePatientRequest): Promise<MutationContext | undefined> => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      const previousPatients = queryClient.getQueryData<PaginatedResponse<Patient>>(['patients']);
      const context: MutationContext = { previousPatients };
      return context;
    },
    onError: (_err: Error, _variables: CreatePatientRequest, context?: MutationContext) => {
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

// Hook to update an existing patient
export const useUpdatePatient = (): UseMutationResult<
  Patient,
  Error,
  { id: string | number; patient: UpdatePatientRequest },
  MutationContext
> => {
  const queryClient = useQueryClient();

  return useMutation<
    Patient,
    Error,
    { id: string | number; patient: UpdatePatientRequest },
    MutationContext
  >({
    mutationFn: ({ id, patient }) => patientService.updatePatient(String(id), patient),
    onMutate: async ({
      id,
    }: {
      id: string | number;
      patient: UpdatePatientRequest;
    }): Promise<MutationContext | undefined> => {
      const patientQueryKey = ['patient', id];
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: patientQueryKey });

      const previousPatients = queryClient.getQueryData<PaginatedResponse<Patient>>(['patients']);
      const previousPatient = queryClient.getQueryData<Patient>(patientQueryKey);

      const context: MutationContext = { previousPatients, previousPatient };
      return context;
    },
    onError: (
      _err: Error,
      { id }: { id: string | number; patient: UpdatePatientRequest },
      context?: MutationContext
    ) => {
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', id], context.previousPatient);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      }
    },
  });
};

// Hook to delete a patient
export const useDeletePatient = (): UseMutationResult<
  DeleteResponse,
  Error,
  string | number,
  MutationContext
> => {
  const queryClient = useQueryClient();

  return useMutation<DeleteResponse, Error, string | number, MutationContext>({
    mutationFn: patientId => patientService.deletePatient(String(patientId)),
    onMutate: async (patientId: string | number): Promise<MutationContext | undefined> => {
      const patientQueryKey = ['patient', patientId];
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: patientQueryKey });

      const previousPatients = queryClient.getQueryData<PaginatedResponse<Patient>>(['patients']);
      const previousPatient = queryClient.getQueryData<Patient>(patientQueryKey);

      queryClient.removeQueries({ queryKey: patientQueryKey });

      const context: MutationContext = { previousPatients, previousPatient };
      return context;
    },
    onError: (_err: Error, patientId: string | number, context?: MutationContext) => {
      if (context?.previousPatients) {
        queryClient.setQueryData(['patients'], context.previousPatients);
      }
      if (context?.previousPatient) {
        queryClient.setQueryData(['patient', patientId], context.previousPatient);
      }
    },
    onSettled: (_data, _error, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.removeQueries({ queryKey: ['patient', patientId] });
    },
  });
};

// Hook for searching patients - Updated Signature & Param Name
export const useSearchPatients = (
  query: string,
  { dateOfBirth, bloodType }: { dateOfBirth?: string; bloodType?: string } = {},
  enabled = true
): UseQueryResult<PaginatedResponse<Patient>, Error> => {
  // Construct SearchPatientsParams using 'name' for the query string
  const searchParams: PatientSearchParams = {
    // Use 'name' based on API doc (query or name) and assuming PatientSearchParams uses 'name'
    name: query,
    page: 1,
    limit: 20,
    ...(dateOfBirth && { dateOfBirth }),
    ...(bloodType && { bloodType }),
  };

  return useQuery<PaginatedResponse<Patient>, Error>({
    queryKey: ['patients', 'search', searchParams],
    queryFn: () => patientService.searchPatients(searchParams),
    enabled: enabled && !!query && query.length >= 2,
    placeholderData: previousData => previousData,
    staleTime: STALE_TIME,
  });
};

// Removed commented-out useAdvancedPatientSearch hook
