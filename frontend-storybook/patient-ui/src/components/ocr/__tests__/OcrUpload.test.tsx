import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OcrUpload } from '../OcrUpload'; // Use named import
import { ocrService } from '../../../services/ocrService'; // Correct path
import environment from '../../../config/environment';

// Mock OCR service
jest.mock('../../../services/ocrService', () => ({
  // Correct path for mock
  ocrService: {
    uploadFile: jest.fn(),
  },
}));

describe('OcrUpload Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OcrUpload {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Input', () => {
    it('should render file input', () => {
      renderComponent();
      expect(screen.getByLabelText(/choose files/i)).toBeInTheDocument();
    });

    it('should show drag and drop zone', () => {
      renderComponent();
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    });

    it('should handle file selection', async () => {
      renderComponent();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, file);

      expect(input.files).toHaveLength(1);
      expect(input.files?.[0]).toBe(file);
    });
  });

  describe('File Validation', () => {
    it('should validate file type', async () => {
      renderComponent();
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, invalidFile);

      expect(screen.getByText(/file type.*is not allowed/i)).toBeInTheDocument();
    });

    it('should validate file size', async () => {
      renderComponent();
      const largeFile = new File(
        [new ArrayBuffer(environment.security.maxFileSize + 1)],
        'large.jpg',
        { type: 'image/jpeg' }
      );
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, largeFile);

      expect(screen.getByText(/file size exceeds maximum/i)).toBeInTheDocument();
    });

    it('should allow multiple files', async () => {
      renderComponent();
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, files);

      expect(input.files).toHaveLength(2);
    });
  });

  describe('Upload Process', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    beforeEach(() => {
      (ocrService.uploadFile as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'pending',
        message: 'Upload successful',
      });
    });

    it('should handle successful upload', async () => {
      const onUploadSuccess = jest.fn();
      renderComponent({ onUploadSuccess });
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      expect(ocrService.uploadFile).toHaveBeenCalledWith(mockFile);
      await waitFor(() => {
        expect(onUploadSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            status: 'pending',
          })
        );
      });
    });

    it('should show upload progress', async () => {
      renderComponent();
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      // Simulate upload progress event
      window.dispatchEvent(
        new CustomEvent('ocr-upload-progress', {
          detail: { progress: 50 },
        })
      );

      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should handle upload errors', async () => {
      (ocrService.uploadFile as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      renderComponent();
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    it('should clear files after successful upload', async () => {
      renderComponent();
      const input = screen.getByLabelText(/choose files/i) as HTMLInputElement; // Assert type

      await userEvent.upload(input, mockFile);
      const uploadButton = screen.getByRole('button', { name: /upload/i });
      await userEvent.click(uploadButton);

      await waitFor(() => {
        expect(input.files).toHaveLength(0);
      });
    });
  });

  describe('Drag and Drop', () => {
    it('should handle file drop', async () => {
      renderComponent();
      const dropzone = screen.getByText(/drag and drop/i).parentElement!;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-blue-500'); // Active state

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText(/test.jpg/)).toBeInTheDocument();
    });

    it('should show active state on drag over', () => {
      renderComponent();
      const dropzone = screen.getByText(/drag and drop/i).parentElement!;

      fireEvent.dragOver(dropzone);
      expect(dropzone).toHaveClass('border-blue-500');

      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('border-blue-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();
      expect(screen.getByLabelText(/choose files/i)).toHaveAttribute(
        'aria-label',
        'Choose files to upload'
      );
      expect(screen.getByRole('button', { name: /upload/i })).toHaveAttribute(
        'aria-label',
        'Upload selected files'
      );
    });

    it('should disable upload button when no files selected', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
    });
  });
});
