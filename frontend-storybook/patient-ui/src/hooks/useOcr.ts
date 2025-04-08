import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ocrService } from '../services/ocrService';
import { OcrResult, OcrStatus, OcrFilters, OcrPaginatedResponse } from '../types/ocr';
import { useCallback } from 'react';

export const useOcr = () => {
  const queryClient = useQueryClient();

  // Query for fetching OCR results with pagination and filters
  const useOcrResults = (page: number = 1, limit: number = 10, filters?: OcrFilters) => {
    return useQuery({
      queryKey: ['ocr-results', page, limit, filters],
      queryFn: () => ocrService.getResults(page, limit, filters),
    });
  };

  // Query for fetching a single OCR result
  const useOcrResult = (id?: number) => {
    return useQuery({
      queryKey: ['ocr-result', id],
      queryFn: () => ocrService.getResult(id!),
      enabled: !!id,
    });
  };

  // Mutation for uploading a file
  const useUploadFile = () => {
    return useMutation({
      mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => 
        ocrService.uploadFile(file, onProgress),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['ocr-results'] });
      },
    });
  };

  // Mutation for deleting an OCR result
  const useDeleteResult = () => {
    return useMutation({
      mutationFn: (id: number) => ocrService.deleteResult(id),
      onSuccess: (_, id) => {
        queryClient.removeQueries({ queryKey: ['ocr-result', id]});
        queryClient.invalidateQueries({ queryKey: ['ocr-results'] });
      },
    });
  };

  // Mutation for retrying failed OCR processing
  const useRetryProcessing = () => {
    return useMutation({
      mutationFn: (id: number) => ocrService.retryProcessing(id),
      onSuccess: (data, id) => {
        queryClient.setQueryData(['ocr-result', id], data);
        queryClient.invalidateQueries({ queryKey: ['ocr-results'] });
      },
    });
  };

  // WebSocket event handler for real-time updates
  const handleOcrProgress = useCallback((event: MessageEvent) => {
    try {
        const progress = JSON.parse(event.data);
        
        // Check if it's an OCR progress update (you might need a type field in the message)
        if (progress && progress.id && progress.status) {
          // Update the specific OCR result in the cache
          queryClient.setQueryData(['ocr-result', progress.id], (old: OcrResult | undefined): OcrResult | undefined => {
            if (!old) return undefined; // Or fetch if not found?
            return {
              ...old,
              status: progress.status,
              error: progress.error, // Assuming error comes in progress update
              // Add any other fields updated via WebSocket (e.g., extracted text preview)
            };
          });

          // If processing is complete/failed, invalidate the results list to refetch full data
          if (progress.status === 'completed' || progress.status === 'failed') {
            queryClient.invalidateQueries({ queryKey: ['ocr-results'] });
          }
      }
    } catch (e) {
        console.error("Error handling WebSocket message:", e);
    }
  }, [queryClient]);

  return {
    useOcrResults,
    useOcrResult,
    useUploadFile,
    useDeleteResult,
    useRetryProcessing,
    handleOcrProgress,
  };
};

export default useOcr; 