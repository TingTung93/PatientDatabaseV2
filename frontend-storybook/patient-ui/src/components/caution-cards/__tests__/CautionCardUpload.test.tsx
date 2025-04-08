import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import react-query wrapper
import { CautionCardUpload } from '../CautionCardUpload';
// Update service imports to the ones actually used
import { cautionCardService } from '../../../services/cautionCardService';
import { ocrService } from '../../../services/ocrService';

// Mock the correct services with explicit implementations for used methods
jest.mock('../../../services/cautionCardService', () => ({
  cautionCardService: {
    processCautionCard: jest.fn(),
    // Add other methods if needed by tests later
  },
}));
jest.mock('../../../services/ocrService', () => ({
  ocrService: {
    processDocument: jest.fn(),
    pollJobStatus: jest.fn(),
    // Add other methods if needed by tests later
  },
}));

// Mock react-query hooks (basic implementation)
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Helper function to wrap component with QueryClientProvider
const renderWithClient = (client: QueryClient, ui: React.ReactElement) => {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('CautionCardUpload', () => {
  let queryClient: QueryClient;
  const mockCautionCardService = cautionCardService as jest.Mocked<typeof cautionCardService>;
  const mockOcrService = ocrService as jest.Mocked<typeof ocrService>;
  const mockUseMutation = jest.requireMock('@tanstack/react-query').useMutation;

  beforeEach(() => {
    // Reset mocks and create a new QueryClient for each test
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Prevent retries in tests
        },
      },
    });

    // Mock useMutation implementation
    mockUseMutation.mockImplementation(
      (
        mutationFn: (vars: any) => Promise<any>,
        options?: {
          onSuccess?: (data: any, variables: any, context: any) => void;
          onError?: (error: any, variables: any, context: any) => void;
        }
      ) => {
        // Add types
        return {
          mutate: (variables: any) => {
            // Simulate async call and callbacks
            Promise.resolve(mutationFn(variables))
              .then(data => options?.onSuccess?.(data, variables, undefined))
              .catch(error => options?.onError?.(error, variables, undefined));
          },
          isLoading: false, // Default mock state
          isError: false,
          error: null,
        };
      }
    );

    // Setup default mock implementations for services
    mockOcrService.processDocument.mockResolvedValue({ jobId: 'ocr-job-123' });
    mockOcrService.pollJobStatus.mockResolvedValue({
      status: 'completed',
      results: { fields: {} },
    });
    mockCautionCardService.processCautionCard.mockResolvedValue({
      // Provide a basic mock CautionCard object
      id: 1,
      file_name: 'test.jpg',
      file_path: '/uploads/test.jpg',
      file_size: 100,
      file_type: 'image/jpeg',
      patient_id: 123,
      blood_type: 'O+',
      antibodies: [],
      transfusion_requirements: [],
      ocr_text: '',
      metadata: {},
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  const defaultProps = {
    patientId: 12345, // Assuming patientId is number based on component props
  };

  const createMockFile = (name: string, type: string) => new File(['test content'], name, { type });

  it('should render upload form with instructions', () => {
    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    expect(screen.getByText(/Upload Caution Card/i)).toBeInTheDocument();
    // Update expected elements based on actual component
    expect(screen.getByLabelText(/Card Image:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Type:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('should handle valid file selection', async () => {
    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    const file = createMockFile('test.jpg', 'image/jpeg');
    const input = screen.getByLabelText(/Card Image:/i); // Use label text

    // userEvent.upload handles act internally
    await userEvent.upload(input, file);

    // Check if file input value is set (indirectly checking state)
    expect(input).toHaveValue('C:\\fakepath\\test.jpg'); // Browser behavior

    // Button should be enabled after file selection
    expect(screen.getByRole('button', { name: /upload/i })).not.toBeDisabled();
  });

  // Remove or rewrite validation test as validation is not handled here anymore
  // it('should handle file validation errors', async () => { ... });

  it('should handle successful file upload', async () => {
    // Default mocks in beforeEach handle success case
    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    const file = createMockFile('test.jpg', 'image/jpeg');
    const input = screen.getByLabelText(/Card Image:/i);
    await userEvent.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await userEvent.click(uploadButton);

    // Wait for the mutation to potentially complete and check service calls
    await waitFor(() => {
      expect(mockOcrService.processDocument).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockOcrService.pollJobStatus).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCautionCardService.processCautionCard).toHaveBeenCalled();
    });

    // Form should be reset after successful upload (input cleared)
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('should handle upload errors', async () => {
    const mockError = new Error('Network error occurred');
    // Mock the service call to reject
    mockCautionCardService.processCautionCard.mockRejectedValueOnce(mockError);

    // Re-mock useMutation for this specific test to capture onError
    const onErrorMock = jest.fn();
    mockUseMutation.mockImplementationOnce(
      (
        mutationFn: (vars: any) => Promise<any>,
        options?: {
          onSuccess?: (data: any, variables: any, context: any) => void;
          onError?: (error: any, variables: any, context: any) => void;
        }
      ) => {
        // Add types
        return {
          mutate: (variables: any) => {
            Promise.resolve(mutationFn(variables))
              .then(data => options?.onSuccess?.(data, variables, undefined))
              .catch(error => {
                options?.onError?.(error, variables, undefined);
                onErrorMock(error); // Call our spy
              });
          },
          isLoading: false,
          isError: true,
          error: mockError,
        };
      }
    );

    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    const file = createMockFile('test.jpg', 'image/jpeg');
    const input = screen.getByLabelText(/Card Image:/i);
    await userEvent.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await userEvent.click(uploadButton);

    // Wait for the generic error message to appear
    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
    expect(
      await screen.findByText('Upload failed. Please check the file or try again later.')
    ).toBeInTheDocument();

    // File input should NOT be cleared after failed upload
    expect(input).toHaveValue('C:\\fakepath\\test.jpg');
  });

  it('should show OCR progress', async () => {
    let progressCallback: (status: { progress: number }) => void = () => {};

    // Mock OCR polling to capture and call the progress callback
    mockOcrService.pollJobStatus.mockImplementation(
      async (jobId: string, onProgress?: (status: { progress: number }) => void) => {
        // Add types
        if (onProgress) {
          progressCallback = onProgress; // Capture the callback
        }
        // Simulate some progress
        await act(async () => {
          progressCallback({ progress: 50 });
        });
        // Simulate completion after progress
        return { status: 'completed', results: { fields: {} } };
      }
    );

    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    const file = createMockFile('test.jpg', 'image/jpeg');
    const input = screen.getByLabelText(/Card Image:/i);
    await userEvent.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await userEvent.click(uploadButton);

    // Check for progress elements
    expect(await screen.findByText(/Processing... 50%/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveValue(50);
    expect(screen.getByRole('button', { name: /processing.../i })).toBeDisabled();

    // Wait for final state (upload complete, form reset)
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  // Remove reset test as there's no explicit reset button
  // it('should handle file reset', async () => { ... });

  it('should disable upload during file upload', async () => {
    // Mock services to return pending promises
    let resolveOcrPoll: (value: any) => void;
    let resolveCardUpload: (value: any) => void;
    mockOcrService.processDocument.mockResolvedValue({ jobId: 'ocr-job-pending' });
    mockOcrService.pollJobStatus.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOcrPoll = resolve;
        })
    );
    mockCautionCardService.processCautionCard.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveCardUpload = resolve;
        })
    );

    // Re-mock useMutation for pending state
    const mutationState = { mutate: jest.fn(), isLoading: true, isError: false, error: null };
    mockUseMutation.mockImplementationOnce((mutationFn: (vars: any) => Promise<any>) => {
      // Add types
      mutationState.mutate = (variables: any) => {
        // Don't resolve automatically
        mutationFn(variables);
      };
      return mutationState;
    });

    renderWithClient(queryClient, <CautionCardUpload {...defaultProps} />);

    const file = createMockFile('test.jpg', 'image/jpeg');
    const input = screen.getByLabelText(/Card Image:/i);
    await userEvent.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await userEvent.click(uploadButton); // This triggers the mutation

    // Check that controls are disabled due to isLoading state from mocked useMutation
    expect(input).toBeDisabled();
    expect(uploadButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /processing.../i })).toBeInTheDocument();

    // Complete the upload
    // Resolve the promises to allow test cleanup
    await act(async () => {
      resolveOcrPoll({ status: 'completed', results: { fields: {} } });
      // Need a slight delay or further waiting if card upload depends on OCR poll resolving
    });
    await act(async () => {
      // Resolve card upload after OCR poll is done
      resolveCardUpload({
        /* mock success data */
      });
    });
  });
});
