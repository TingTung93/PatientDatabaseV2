import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OcrResult } from '../OcrResult';
import { websocketService } from '../../services/websocketService';

// Mock websocketService
jest.mock('../../services/websocketService', () => ({
  websocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    addMessageHandler: jest.fn(),
    removeMessageHandler: jest.fn(),
    send: jest.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('OcrResult Component', () => {
  const mockResult = {
    file_name: 'test.jpg',
    file_path: '/test.jpg',
    text: 'Sample OCR text',
    confidence: 95,
    created_at: 'Apr 5, 2024, 08:00 AM',
    updated_at: 'Apr 5, 2024, 08:01 AM',
    status: 'completed' as const,
  };

  const errorResult = {
    ...mockResult,
    status: 'failed' as const,
    error: 'Processing failed',
  };

  const noTextResult = {
    ...mockResult,
    text: null,
  };

  const renderComponent = (props = {}) => {
    return render(
      <OcrResult
        result={mockResult}
        {...props}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render file details correctly', () => {
      renderComponent();

      expect(screen.getByText(mockResult.file_name)).toBeInTheDocument();
      expect(screen.getByText(/processing complete/i)).toBeInTheDocument();
      expect(screen.getByText(/created:/i)).toBeInTheDocument();
      expect(screen.getByText(/updated:/i)).toBeInTheDocument();
    });

    it('should render OCR text when available', () => {
      renderComponent();

      const textElement = screen.getByText(mockResult.text);
      expect(textElement).toBeInTheDocument();
      expect(textElement.tagName.toLowerCase()).toBe('pre');
    });

    it('should render confidence score', () => {
      renderComponent();

      expect(screen.getByText(/confidence:/i)).toBeInTheDocument();
      expect(screen.getByText(/95%/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should render error message when status is failed', () => {
      renderComponent({ result: errorResult });

      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(errorResult.error)).toBeInTheDocument();
    });

    it('should not render error message when status is completed', () => {
      renderComponent();

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle copy text action', async () => {
      renderComponent();

      const copyButton = screen.getByTitle('Copy text');
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResult.text);
    });

    it('should handle retry action', async () => {
      const onRetry = jest.fn();
      renderComponent({ result: errorResult, onRetry });

      const retryButton = screen.getByLabelText('retry');
      await userEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });

    it('should handle image preview', async () => {
      renderComponent();

      const imagePreview = screen.getByAltText('OCR Document');
      await userEvent.click(imagePreview);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'OCR Document' })).toHaveAttribute(
        'src',
        mockResult.file_path
      );
    });
  });

  describe('Tab Navigation', () => {
    it('should render tabs correctly', () => {
      renderComponent();

      expect(screen.getByRole('tab', { name: /extracted text/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analysis/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /structured data/i })).toBeInTheDocument();
    });

    it('should disable tabs when text is not available', () => {
      renderComponent({ result: noTextResult });

      const analysisTab = screen.getByRole('tab', { name: /analysis/i });
      const structuredTab = screen.getByRole('tab', { name: /structured data/i });

      expect(analysisTab).toHaveAttribute('aria-disabled', 'true');
      expect(structuredTab).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect to websocket on mount', () => {
      renderComponent();
      expect(websocketService.connect).toHaveBeenCalled();
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