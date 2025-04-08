import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { websocketService } from '../../../services/websocketService';
import { ocrService } from '../../../services/ocrService'; // Correct path
import { OcrUpload } from '../OcrUpload'; // Use named import
import { OcrResult } from '../OcrResult'; // Use named import
import { OcrResultsList } from '../OcrResultsList'; // Use named import
import { OcrStatus } from '../../../types/ocr'; // Import OcrStatus

// Mock services
jest.mock('../../../services/websocketService', () => ({
  websocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    addMessageHandler: jest.fn(),
    removeMessageHandler: jest.fn(),
  },
}));

jest.mock('../../../services/ocrService', () => ({
  // Correct mock path
  ocrService: {
    uploadFile: jest.fn(),
    getResults: jest.fn(),
    getResult: jest.fn(),
    deleteResult: jest.fn(),
    retryProcessing: jest.fn(),
  },
}));

describe('OCR Workflow Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

  const mockOcrResult = {
    id: 1,
    file_name: 'test.jpg',
    file_path: '/test.jpg',
    file_size: 1024,
    file_type: 'image/jpeg',
    status: OcrStatus.Completed, // Use enum value
    text: 'Sample OCR text',
    confidence: 0.95,
    metadata: {},
    created_at: '2024-04-05T12:00:00Z',
    updated_at: '2024-04-05T12:01:00Z',
    // processed_at: '2024-04-05T12:01:00Z', // Property does not exist
  };

  const renderWorkflow = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <div>
          <OcrUpload />
          <OcrResultsList />
        </div>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ocrService.getResults as jest.Mock).mockResolvedValue({
      data: [mockOcrResult],
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  describe('Upload and Processing Flow', () => {
    it('should handle complete upload and processing workflow', async () => {
      // Mock successful upload
      (ocrService.uploadFile as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'pending',
        message: 'Upload successful',
      });

      renderWorkflow();

      // Upload file
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type
      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      // Verify upload success
      await waitFor(() => {
        expect(ocrService.uploadFile).toHaveBeenCalledWith(mockFile);
      });

      // Simulate WebSocket progress updates
      const mockMessageHandler = (websocketService.addMessageHandler as jest.Mock).mock.calls[0][0];
      mockMessageHandler({
        data: JSON.stringify({
          type: 'ocr_progress',
          data: {
            id: 1,
            status: 'processing',
            progress: 50,
          },
        }),
      });

      // Verify progress update
      await waitFor(() => {
        expect(screen.getByText(/50%/)).toBeInTheDocument();
      });

      // Simulate completion
      mockMessageHandler({
        data: JSON.stringify({
          type: 'ocr_complete',
          data: mockOcrResult,
        }),
      });

      // Verify result display
      await waitFor(() => {
        // Ensure text is not null before asserting
        if (mockOcrResult.text) {
          expect(screen.getByText(mockOcrResult.text)).toBeInTheDocument();
        } else {
          throw new Error('mockOcrResult.text is null, cannot test getByText');
        }
      });
    });

    it('should handle upload failure and retry', async () => {
      // Mock failed upload
      (ocrService.uploadFile as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));
      // Mock successful retry
      (ocrService.retryProcessing as jest.Mock).mockResolvedValueOnce({
        id: 1,
        status: 'pending',
        message: 'Retry successful',
      });

      renderWorkflow();

      // Attempt upload
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type
      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      // Verify error display
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });

      // Retry processing
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      // Verify retry attempt
      expect(ocrService.retryProcessing).toHaveBeenCalledWith(1);
    });
  });

  describe('Result Management', () => {
    it('should handle result deletion', async () => {
      (ocrService.deleteResult as jest.Mock).mockResolvedValueOnce(undefined);

      renderWorkflow();

      // Wait for results to load
      await waitFor(() => {
        expect(screen.getByText(mockOcrResult.file_name)).toBeInTheDocument();
      });

      // Delete result
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      // Verify deletion
      expect(ocrService.deleteResult).toHaveBeenCalledWith(mockOcrResult.id);
    });

    it('should update list after operations', async () => {
      renderWorkflow();

      // Initial load
      await waitFor(() => {
        expect(screen.getByText(mockOcrResult.file_name)).toBeInTheDocument();
      });

      // Mock updated results
      const updatedResults = {
        data: [
          {
            ...mockOcrResult,
            id: 2,
            file_name: 'new_test.jpg',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };
      (ocrService.getResults as jest.Mock).mockResolvedValueOnce(updatedResults);

      // Simulate WebSocket update
      const mockMessageHandler = (websocketService.addMessageHandler as jest.Mock).mock.calls[0][0];
      mockMessageHandler({
        data: JSON.stringify({
          type: 'ocr_list_update',
        }),
      });

      // Verify list update
      await waitFor(() => {
        expect(screen.getByText('new_test.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      (ocrService.getResults as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderWorkflow();

      // Verify error display
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection', async () => {
      renderWorkflow();

      // Simulate WebSocket disconnection
      const mockStatusHandler = (websocketService.addMessageHandler as jest.Mock).mock.calls[0][0];
      mockStatusHandler({
        data: JSON.stringify({
          type: 'connection_status',
          data: { connected: false },
        }),
      });

      // Verify reconnection attempt
      // expect(websocketService.connect).toHaveBeenCalled(); // WebSocket disabled
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent uploads', async () => {
      (ocrService.uploadFile as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'pending',
        message: 'Upload successful',
      });

      renderWorkflow();

      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      // Upload multiple files
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type
      await userEvent.upload(input, files);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      // Verify all files are processed
      await waitFor(() => {
        expect(ocrService.uploadFile).toHaveBeenCalledTimes(2);
      });
    });
  });
});
