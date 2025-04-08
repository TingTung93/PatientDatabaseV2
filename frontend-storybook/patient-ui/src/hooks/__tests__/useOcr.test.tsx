import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { useOcr } from '../useOcr'; // Adjust path
import { ocrService } from '../../services/ocrService'; // Adjust path
import { OcrResult, OcrPaginatedResponse, OcrUploadResponse, OcrStatus } from '../../types/ocr'; // Adjust path

// Mock the ocrService
jest.mock('../../services/ocrService');

// Create typed mock functions for service methods
const mockGetResults = ocrService.getResults as jest.Mock;
const mockGetResult = ocrService.getResult as jest.Mock;
const mockUploadFile = ocrService.uploadFile as jest.Mock;
const mockDeleteResult = ocrService.deleteResult as jest.Mock;
const mockRetryProcessing = ocrService.retryProcessing as jest.Mock;

// --- Test Setup ---

// Function to create a new QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity, // Prevent stale data during tests
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

describe('useOcr Hook', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    // Create a new client for each test to ensure isolation
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    jest.clearAllMocks();
  });

  // Destructure the hook functions inside the test suite
  const setupHook = () => renderHook(() => useOcr(), { wrapper });

  // --- useOcrResults ---
  describe('useOcrResults', () => {
    it('should fetch results with params and return data', async () => {
      const mockData: OcrPaginatedResponse = {
        data: [{ id: 1 } as OcrResult],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockGetResults.mockResolvedValue(mockData);
      const { result } = setupHook();

      // Call the specific query hook returned by useOcr
      const { result: queryResult } = renderHook(() => result.current.useOcrResults(1, 10), {
        wrapper,
      });

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));
      expect(queryResult.current.data).toEqual(mockData);
      expect(mockGetResults).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should return error state when fetch fails', async () => {
      const mockError = new Error('Failed to fetch');
      mockGetResults.mockRejectedValue(mockError);
      const { result } = setupHook();

      const { result: queryResult } = renderHook(() => result.current.useOcrResults(1, 10), {
        wrapper,
      });

      await waitFor(() => expect(queryResult.current.isError).toBe(true));
      expect(queryResult.current.error).toEqual(mockError);
    });
  });

  // --- useOcrResult ---
  describe('useOcrResult', () => {
    it('should fetch single result when ID is provided', async () => {
      const resultId = 1;
      const mockResultData = { id: resultId } as OcrResult;
      mockGetResult.mockResolvedValue(mockResultData);
      const { result } = setupHook();

      const { result: queryResult } = renderHook(() => result.current.useOcrResult(resultId), {
        wrapper,
      });

      await waitFor(() => expect(queryResult.current.isSuccess).toBe(true));
      expect(queryResult.current.data).toEqual(mockResultData);
      expect(mockGetResult).toHaveBeenCalledWith(resultId);
    });

    it('should not fetch if ID is not provided', () => {
      // Test disabled state by passing undefined ID
      const { result } = setupHook();
      // Call hook with undefined ID (hook internally sets enabled: !!id)
      renderHook(() => result.current.useOcrResult(undefined), { wrapper });
      expect(mockGetResult).not.toHaveBeenCalled();
    });
  });

  // --- useUploadFile ---
  describe('useUploadFile', () => {
    it('should call uploadFile service and invalidate queries on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      // Correct the mock response to match OcrUploadResponse type
      const mockResponse: OcrUploadResponse = {
        id: 123, // number
        status: OcrStatus.Processing, // OcrStatus
        file_name: 'test.pdf', // string
      };
      mockUploadFile.mockResolvedValue(mockResponse);
      const mockProgressFn = jest.fn();
      const { result } = setupHook();

      await act(async () => {
        await result.current
          .useUploadFile()
          .mutateAsync({ file: mockFile, onProgress: mockProgressFn });
      });

      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, mockProgressFn);
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should handle upload error', async () => {
      const mockError = new Error('Upload failed');
      mockUploadFile.mockRejectedValue(mockError);
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const { result } = setupHook();
      const uploadMutation = result.current.useUploadFile();

      await act(async () => {
        try {
          await uploadMutation.mutateAsync({ file: mockFile });
        } catch (e) {
          // Expected error
        }
      });

      expect(uploadMutation.isError).toBe(true);
      expect(uploadMutation.error).toEqual(mockError);
    });
  });

  // --- useDeleteResult ---
  describe('useDeleteResult', () => {
    it('should call deleteResult service and invalidate queries on success', async () => {
      const resultIdToDelete = 1;
      mockDeleteResult.mockResolvedValue({ success: true });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const removeSpy = jest.spyOn(queryClient, 'removeQueries');
      const { result } = setupHook();

      await act(async () => {
        await result.current.useDeleteResult().mutateAsync(resultIdToDelete);
      });

      expect(mockDeleteResult).toHaveBeenCalledWith(resultIdToDelete);
      expect(invalidateSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['ocrResult', resultIdToDelete] });
    });
  });

  // --- useRetryProcessing ---
  describe('useRetryProcessing', () => {
    it('should call retryProcessing service and invalidate queries on success', async () => {
      const resultIdToRetry = 1;
      mockRetryProcessing.mockResolvedValue({ success: true });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = setupHook();

      await act(async () => {
        await result.current.useRetryProcessing().mutateAsync(resultIdToRetry);
      });

      expect(mockRetryProcessing).toHaveBeenCalledWith(resultIdToRetry);
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
