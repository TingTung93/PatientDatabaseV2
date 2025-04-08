import { fileUploadService, UploadProgress, UploadResult } from '../FileUploadService';
import { FileTypeCategory } from '../FileValidationService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FileUploadService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockFetch.mockReset();
  });

  const createMockFile = (name: string, size: number, type: string): File => {
    return new File(['mock content'], name, { type });
  };

  describe('uploadFile', () => {
    it('should successfully upload a file with progress updates', async () => {
      // Mock successful upload response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            fileUrl: 'https://example.com/files/test.jpg',
          }),
      });

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const patientId = '12345';
      const onProgress = jest.fn();

      const result = await fileUploadService.uploadFile(
        file,
        FileTypeCategory.CautionCard,
        patientId,
        onProgress
      );

      // Verify successful upload
      expect(result.success).toBe(true);
      expect(result.fileUrl).toBe('https://example.com/files/test.jpg');

      // Verify progress callback was called
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          percent: expect.any(Number),
          loaded: expect.any(Number),
          total: expect.any(Number),
        })
      );

      // Verify correct request was made
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json', // Should be multipart/form-data
          }),
        })
      );
    });

    it('should handle upload failure with error message', async () => {
      const errorMessage = 'Upload failed due to server error';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(errorMessage),
      });

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const patientId = '12345';

      const result = await fileUploadService.uploadFile(
        file,
        FileTypeCategory.CautionCard,
        patientId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain(errorMessage);
    });

    it('should handle network errors during upload', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const patientId = '12345';

      const result = await fileUploadService.uploadFile(
        file,
        FileTypeCategory.CautionCard,
        patientId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('should include patient ID and file type in upload request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, fileUrl: 'https://example.com/files/test.jpg' }),
      });

      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const patientId = '12345';

      await fileUploadService.uploadFile(file, FileTypeCategory.CautionCard, patientId);

      const formDataInRequest = mockFetch.mock.calls[0][1].body;
      expect(formDataInRequest instanceof FormData).toBe(true);
      expect(formDataInRequest.get('patientId')).toBe(patientId);
      expect(formDataInRequest.get('fileType')).toBe(FileTypeCategory.CautionCard);
      expect(formDataInRequest.get('file')).toBeInstanceOf(File);
    });

    it('should validate required parameters', async () => {
      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');

      // @ts-expect-error Testing missing required parameter
      await expect(
        fileUploadService.uploadFile(file, FileTypeCategory.CautionCard)
      ).rejects.toThrow('Patient ID is required');

      // @ts-expect-error Testing missing required parameter
      await expect(fileUploadService.uploadFile(file)).rejects.toThrow(
        'File type category is required'
      );

      await expect(
        fileUploadService.uploadFile(null as unknown as File, FileTypeCategory.CautionCard, '12345')
      ).rejects.toThrow('File is required');
    });
  });
});
