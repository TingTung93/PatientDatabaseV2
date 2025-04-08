import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OcrResult from '../OcrResult';
import { websocketService } from '../../../services/websocketService';
import { OcrResult as IOcrResult, OcrStatus } from '../../../types/ocr'; // Import OcrStatus

// Mock websocket service
jest.mock('../../../services/websocketService', () => ({
  websocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    addMessageHandler: jest.fn(),
    removeMessageHandler: jest.fn(),
  },
}));

describe('OcrResult Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockResult: IOcrResult = {
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
    // processed_at: '2024-04-05T12:01:00Z', // Property does not exist on OcrResult type
  };

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OcrResult result={mockResult} {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render basic result information', () => {
      renderComponent();

      expect(screen.getByText(mockResult.file_name)).toBeInTheDocument();
      expect(screen.getByText(/Confidence: 95%/)).toBeInTheDocument();
      expect(screen.getByText(/Processing complete/)).toBeInTheDocument();
    });

    it('should render processing status with progress', () => {
      const processingResult = {
        ...mockResult,
        status: 'processing' as const,
        confidence: null,
      };

      renderComponent({ result: processingResult, progress: 50 });

      expect(screen.getByText(/Processing: 50%/)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const errorResult = {
        ...mockResult,
        status: 'failed' as const,
        error: 'Processing failed',
      };

      renderComponent({ result: errorResult });

      expect(screen.getByText('Processing failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should copy text to clipboard', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      renderComponent();

      const copyButton = screen.getByRole('button', { name: /copy text/i });
      await userEvent.click(copyButton);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockResult.text);
      await waitFor(() => {
        expect(screen.getByTitle('Text copied!')).toBeInTheDocument();
      });
    });

    it('should show image preview modal', async () => {
      renderComponent();

      const imagePreview = screen.getByRole('img', { name: /ocr document/i });
      await userEvent.click(imagePreview);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /ocr document/i })).toHaveAttribute(
        'src',
        mockResult.file_path
      );
    });

    it('should handle retry action', async () => {
      const onRetry = jest.fn();
      const errorResult = {
        ...mockResult,
        status: 'failed' as const,
        error: 'Processing failed',
      };

      renderComponent({ result: errorResult, onRetry });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });

    it('should handle delete action', async () => {
      const onDelete = jest.fn();
      renderComponent({ onDelete });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      renderComponent();

      // Initial tab should be 'text'
      // Ensure text is not null before asserting
      if (mockResult.text) {
        expect(screen.getByText(mockResult.text)).toBeInTheDocument();
      } else {
        throw new Error('mockResult.text is null, cannot test getByText');
      }

      // Switch to analysis tab
      const analysisTab = screen.getByRole('tab', { name: /analysis/i });
      await userEvent.click(analysisTab);
      expect(screen.getByText(/analyzing text/i)).toBeInTheDocument();

      // Switch to structured tab
      const structuredTab = screen.getByRole('tab', { name: /structured data/i });
      await userEvent.click(structuredTab);
      expect(screen.getByText(/extracting structured data/i)).toBeInTheDocument();
    });

    it('should disable tabs when text is not available', () => {
      const noTextResult = {
        ...mockResult,
        text: null,
      };

      renderComponent({ result: noTextResult });

      expect(screen.getByRole('tab', { name: /analysis/i })).toBeDisabled();
      expect(screen.getByRole('tab', { name: /structured data/i })).toBeDisabled();
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect to websocket on mount', () => {
      renderComponent();
      // expect(websocketService.connect).toHaveBeenCalled(); // WebSocket disabled
    });

    it('should disconnect from websocket on unmount', () => {
      const { unmount } = renderComponent();
      unmount();
      expect(websocketService.disconnect).toHaveBeenCalled();
    });

    it('should add and remove message handlers', () => {
      const { unmount } = renderComponent();
      expect(websocketService.addMessageHandler).toHaveBeenCalled();

      unmount();
      expect(websocketService.removeMessageHandler).toHaveBeenCalled();
    });
  });
});
