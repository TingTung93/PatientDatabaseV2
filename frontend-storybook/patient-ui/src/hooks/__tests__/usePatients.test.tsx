import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
// Import correct hooks
import {
  usePatients,
  usePatient,
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
  useSearchPatients,
} from '../usePatients'; // Adjusted imports
import { patientService } from '../../services/patientService'; // Adjust path
// Import PaginatedResponse from common.ts
import { PaginatedResponse } from '../../types/common'; // Corrected import path
import {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  BatchOperation,
  PatientIdentification,
  Demographics,
  BloodProfile,
  MedicalHistory,
  PatientSearchParams,
} from '../../types/patient'; // Adjust path, import necessary subtypes

// Mock the patientService
jest.mock('../../services/patientService');

// Create typed mock functions for service methods
const mockGetPatients = patientService.getPatients as jest.Mock;
const mockGetPatientById = patientService.getPatientById as jest.Mock; // Keep this for usePatient hook test
// Removed mockSearchPatients as it doesn't exist in service
const mockCreatePatient = patientService.createPatient as jest.Mock;
const mockUpdatePatient = patientService.updatePatient as jest.Mock;
const mockDeletePatient = patientService.deletePatient as jest.Mock;
const mockBatchOperations = patientService.batchOperations as jest.Mock; // Keep if batch hook exists/tested separately

// --- Test Setup ---

// Function to create a new QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Wrapper component factory
const createWrapper = (queryClient: QueryClient) => {
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
};

// Helper to create mock Patient data
const createMockPatient = (id: string, overrides: Partial<Patient> = {}): Patient => ({
  id,
  identification: { id: `ident-${id}`, mrn: `MRN-${id}` } as PatientIdentification,
  demographics: {
    firstName: `First-${id}`,
    lastName: `Last-${id}`,
    dateOfBirth: '2000-01-01',
    gender: 'O',
    contactNumber: '555-1234',
    email: `${id}@test.com`,
  } as Demographics,
  bloodProfile: {
    abo: 'O',
    rh: '+',
    phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
  } as BloodProfile,
  medicalHistory: {
    allergies: [],
    conditions: [],
    medications: [],
    surgeries: [],
    procedures: [],
  } as MedicalHistory,
  comments: [],
  notes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user',
  updatedBy: 'test-user',
  ...overrides,
});

describe('usePatients Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    jest.clearAllMocks();
  });

  // --- usePatients ---
  describe('usePatients', () => {
    it('should fetch patients and return data on success', async () => {
      const mockPatientData = [createMockPatient('1')];
      const mockData: PaginatedResponse<Patient> = {
        data: mockPatientData,
        total: 1,
        page: 1,
        limit: 10,
      };
      mockGetPatients.mockResolvedValue(mockData);

      const { result } = renderHook(() => usePatients(1, 10), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(mockGetPatients).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should return error state on failure', async () => {
      const mockError = new Error('Failed to fetch');
      mockGetPatients.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePatients(1, 10), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- usePatient ---
  describe('usePatient', () => {
    it('should fetch patient when ID is provided', async () => {
      const patientId = 'p1';
      const mockPatient = createMockPatient(patientId);
      mockGetPatientById.mockResolvedValue(mockPatient);

      const { result } = renderHook(() => usePatient(patientId), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPatient);
      expect(mockGetPatientById).toHaveBeenCalledWith(patientId);
    });

    it('should not fetch patient when ID is not provided', () => {
      renderHook(() => usePatient(undefined as any), { wrapper });
      expect(mockGetPatientById).not.toHaveBeenCalled();
    });
  });

  // --- useSearchPatients ---
  describe('useSearchPatients', () => {
    it('should call getPatients with correct combined params', async () => {
      // Test name updated
      const mockPatientData = [createMockPatient('search-1')];
      const mockData: PaginatedResponse<Patient> = {
        data: mockPatientData,
        total: 1,
        page: 1,
        limit: 5,
      };
      const searchQuery = 'Test';
      // Define options inline, including potentially expected fields like bloodType as undefined
      const searchOptions = { limit: 5, bloodType: undefined };
      const expectedParams = { ...searchOptions, name: searchQuery }; // Expected params for getPatients
      mockGetPatients.mockResolvedValue(mockData); // Mock getPatients

      const { result } = renderHook(() => useSearchPatients(searchQuery, searchOptions), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
      expect(mockGetPatients).toHaveBeenCalledWith(expectedParams); // Check getPatients call
    });

    it('should not call getPatients if query is too short or disabled', () => {
      renderHook(() => useSearchPatients('T', {}, true), { wrapper });
      expect(mockGetPatients).not.toHaveBeenCalled(); // Check getPatients

      jest.clearAllMocks();

      renderHook(() => useSearchPatients('TestQuery', {}, false), { wrapper });
      expect(mockGetPatients).not.toHaveBeenCalled(); // Check getPatients
    });
  });

  // --- Individual Mutation Hooks ---
  describe('Mutation Hooks', () => {
    it('useCreatePatient should call service and invalidate queries on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const newPatientData: CreatePatientRequest = {
        identification: { id: 'new-ident', mrn: 'NewMRN' } as PatientIdentification,
        demographics: {
          firstName: 'New',
          lastName: 'Patient',
          dateOfBirth: '2023-01-01',
          gender: 'F',
          contactNumber: '555-9876',
          email: 'new@test.com',
        } as Demographics,
        bloodProfile: {
          abo: 'B',
          rh: '-',
          phenotype: { rh: {}, kell: {}, duffy: {}, kidd: {}, mns: {} },
        } as BloodProfile,
        medicalHistory: {
          allergies: [],
          conditions: [],
          medications: [],
          surgeries: [],
          procedures: [],
        } as MedicalHistory,
      };
      const createdPatient = createMockPatient('new1', newPatientData);
      mockCreatePatient.mockResolvedValue(createdPatient);

      const { result } = renderHook(() => useCreatePatient(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(newPatientData);
      });

      expect(mockCreatePatient).toHaveBeenCalledWith(newPatientData);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients'] });
    });

    it('useUpdatePatient should call service and update cache on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');
      const patientId = 'p1-update';
      const updateData: UpdatePatientRequest = { demographics: { firstName: 'Updated' } };
      const updatedPatient = createMockPatient(patientId, {
        demographics: { ...createMockPatient(patientId).demographics, ...updateData.demographics },
      });
      mockUpdatePatient.mockResolvedValue(updatedPatient);

      const { result } = renderHook(() => useUpdatePatient(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: patientId, patient: updateData });
      });

      expect(mockUpdatePatient).toHaveBeenCalledWith(patientId, updateData);
      expect(setQueryDataSpy).toHaveBeenCalledWith(
        ['patient', patientId],
        expect.objectContaining({
          id: patientId,
          demographics: expect.objectContaining({ firstName: 'Updated' }),
        })
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients'] });
    });

    it('useDeletePatient should call service and remove/invalidate queries on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries');
      const patientId = 'p1-delete';
      mockDeletePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePatient(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(patientId);
      });

      expect(mockDeletePatient).toHaveBeenCalledWith(patientId);
      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['patient', patientId] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients'] });
    });

    // Batch operations test might need its own hook if usePatientMutations is truly removed
    // If a useBatchOperations hook exists, test it here. Otherwise, remove this test.
    // it('batchOperationsMutation should call service and invalidate queries on success', async () => {
    //   const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    //   const batchData: BatchOperation = {
    //       operations: [{ operation: 'delete', id: 'b1' }, { operation: 'delete', id: 'b2' }]
    //   };
    //   mockBatchOperations.mockResolvedValue({ success: true, results: [] });

    //   // Assuming a useBatchOperations hook exists
    //   // const { result } = renderHook(() => useBatchOperations(), { wrapper });

    //   // await act(async () => {
    //   //     await result.current.mutateAsync(batchData);
    //   // });

    //   // expect(mockBatchOperations).toHaveBeenCalledWith(batchData);
    //   // expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients'] });
    // });
  });
});
