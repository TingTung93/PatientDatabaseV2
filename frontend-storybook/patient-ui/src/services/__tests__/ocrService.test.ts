import { ocrService } from '../ocrService'; // Adjust path as needed
import { apiClient } from '../../api/apiClient'; // Adjust path as needed
import {
  OcrResult,
  OcrUploadResponse,
  OcrFilters,
  OcrPaginatedResponse,
  OcrStatus,
} from '../../types/ocr'; // Adjust path as needed
import environment from '../../config/environment'; // Import environment config

// Mock the apiClient
jest.mock('../../api/apiClient');

// Create a typed mock instance
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// --- Mocks & Setup ---
describe('ocrService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // --- File Validation (Testing the internal validateFile logic) ---
  // We need to test the validation logic embedded within the service.
  // One way is to slightly refactor ocrService to export validateFile,
  // or test it indirectly via uploadFile.
  // Let's test indirectly for now.

  it('uploadFile should throw validation error for oversized file', async () => {
    const largeFile = new File(['a'.repeat(environment.security.maxFileSize + 1)], 'large.pdf', {
      type: 'application/pdf',
    });
    const expectedErrorMsg = `File size exceeds maximum allowed size of ${environment.security.maxFileSize / 1024 / 1024}MB`;

    await expect(ocrService.uploadFile(largeFile)).rejects.toThrow(expectedErrorMsg);
    expect(mockApiClient.post).not.toHaveBeenCalled(); // Ensure API was not called
  });

  it('uploadFile should throw validation error for disallowed file type', async () => {
    const wrongTypeFile = new File(['content'], 'text.txt', { type: 'text/plain' });
    const expectedErrorMsg = `File type text/plain is not allowed. Allowed types: ${environment.security.allowedFileTypes.join(', ')}`;

    await expect(ocrService.uploadFile(wrongTypeFile)).rejects.toThrow(expectedErrorMsg);
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  // --- uploadFile API Call ---
  it('uploadFile should call apiClient.post with FormData and progress callback', async () => {
    const validFile = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });
    const mockResponse: OcrUploadResponse = {
      id: 123,
      status: OcrStatus.Pending,
      file_name: 'report.pdf',
    }; // Use number for ID, add file_name
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });
    const mockProgressFn = jest.fn();

    const result = await ocrService.uploadFile(validFile, mockProgressFn);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      `${environment.api.baseUrl}/ocr/upload`,
      expect.any(FormData), // Check that FormData is passed
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: expect.any(Function), // Check that progress function is passed
      })
    );
    expect(result).toEqual(mockResponse);

    // Simulate progress event call by mock (if possible/needed)
    // This part is tricky without controlling the axios mock internals deeply
    // const progressCallback = mockApiClient.post.mock.calls[0][2].onUploadProgress;
    // progressCallback({ loaded: 50, total: 100 });
    // expect(mockProgressFn).toHaveBeenCalledWith(50);
  });

  it('uploadFile should handle API errors', async () => {
    const validFile = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' });
    const mockError = new Error('Upload Failed');
    mockApiClient.post.mockRejectedValueOnce(mockError);

    await expect(ocrService.uploadFile(validFile)).rejects.toThrow('Upload Failed');
    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
  });

  // --- getResult ---
  it('getResult should call apiClient.get with correct ID', async () => {
    const resultId = 123;
    const mockResult: OcrResult = {
      id: resultId,
      file_name: 'test.pdf',
      status: OcrStatus.Completed,
    } as OcrResult;
    mockApiClient.get.mockResolvedValueOnce({ data: mockResult });

    const result = await ocrService.getResult(resultId);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith(
      `${environment.api.baseUrl}/ocr/results/${resultId}`
    );
    expect(result).toEqual(mockResult);
  });

  // --- getResults ---
  it('getResults should call apiClient.get with pagination and filters', async () => {
    const page = 2;
    const limit = 5;
    const filters: OcrFilters = { status: OcrStatus.Failed, search: 'error' };
    const mockResponse: OcrPaginatedResponse = { data: [], total: 0, page, limit };
    mockApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    await ocrService.getResults(page, limit, filters);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith(`${environment.api.baseUrl}/ocr/results`, {
      params: { page, limit, ...filters },
    });
  });

  // --- deleteResult ---
  it('deleteResult should call apiClient.delete with correct ID', async () => {
    const resultId = 456;
    mockApiClient.delete.mockResolvedValueOnce({ status: 204 }); // Simulate success

    await ocrService.deleteResult(resultId);

    expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `${environment.api.baseUrl}/ocr/results/${resultId}`
    );
  });

  // --- retryProcessing ---
  it('retryProcessing should call apiClient.post with correct ID', async () => {
    const resultId = 789;
    const mockResponse: OcrUploadResponse = {
      id: 456,
      status: OcrStatus.Pending,
      file_name: 'retry_report.pdf',
    }; // Use number for ID, add file_name
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await ocrService.retryProcessing(resultId);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      `${environment.api.baseUrl}/ocr/results/${resultId}/retry`
    );
    expect(result).toEqual(mockResponse);
  });
});
