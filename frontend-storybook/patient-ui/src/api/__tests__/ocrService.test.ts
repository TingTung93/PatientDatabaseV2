import axios, { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { ocrService } from '../../services/ocrService';
import { OcrStatus } from '../../types/ocr'; // Import OcrStatus
import environment from '../../config/environment';

describe('OCR Service', () => {
  let mockAxios: MockAdapter;
  const BASE_URL = `${environment.api.baseUrl}/ocr`;
  const csrfToken = 'test-csrf-token';

  beforeEach(() => {
    // Setup CSRF meta tag
    const meta = document.createElement('meta');
    meta.name = environment.security.csrfHeaderName;
    meta.content = csrfToken;
    document.head.appendChild(meta);

    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
    document.head.querySelector(`meta[name="${environment.security.csrfHeaderName}"]`)?.remove();
  });

  // Define files at a higher scope
  const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const invalidTypeFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
  const largefile = new File([new ArrayBuffer(environment.security.maxFileSize + 1)], 'large.jpg', {
    type: 'image/jpeg',
  });

  describe('File Upload Security', () => {
    it('should validate file type before upload', async () => {
      await expect(ocrService.uploadFile(invalidTypeFile)).rejects.toThrow(
        /File type.*is not allowed/
      );
    });

    it('should validate file size before upload', async () => {
      await expect(ocrService.uploadFile(largefile)).rejects.toThrow(/File size exceeds maximum/);
    });

    it('should include CSRF token in upload request', async () => {
      mockAxios.onPost(`${BASE_URL}/upload`).reply((config: AxiosRequestConfig) => {
        expect(config.headers?.[environment.security.csrfHeaderName]).toBe(csrfToken);
        return [200, { id: 1, status: 'pending', message: 'Upload successful' }];
      });

      await ocrService.uploadFile(validFile);
    });

    it('should track upload progress', async () => {
      const progressEvents: number[] = [];

      window.addEventListener('ocr-upload-progress', event => {
        // Assuming event is CustomEvent<{ progress: number }> based on usage
        const customEvent = event as CustomEvent<{ progress: number }>;
        progressEvents.push(customEvent.detail.progress);
      });

      mockAxios.onPost(`${BASE_URL}/upload`).reply((config: AxiosRequestConfig) => {
        // Simulate upload progress
        if (config.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 } as AxiosProgressEvent);
          config.onUploadProgress({ loaded: 100, total: 100 } as AxiosProgressEvent);
        }
        return [200, { id: 1, status: 'pending', message: 'Upload successful' }];
      });

      await ocrService.uploadFile(validFile);
      expect(progressEvents).toEqual([50, 100]);
    });
  });

  describe('API Security', () => {
    it('should include CSRF token in GET requests', async () => {
      mockAxios.onGet(`${BASE_URL}/results/1`).reply((config: AxiosRequestConfig) => {
        expect(config.headers?.[environment.security.csrfHeaderName]).toBe(csrfToken);
        return [200, { id: 1 }];
      });

      await ocrService.getResult(1);
    });

    it('should include CSRF token in DELETE requests', async () => {
      mockAxios.onDelete(`${BASE_URL}/results/1`).reply((config: AxiosRequestConfig) => {
        expect(config.headers?.[environment.security.csrfHeaderName]).toBe(csrfToken);
        return [200];
      });

      await ocrService.deleteResult(1);
    });

    it('should handle missing CSRF token gracefully', async () => {
      document.head.querySelector(`meta[name="${environment.security.csrfHeaderName}"]`)?.remove();

      mockAxios.onGet(`${BASE_URL}/results/1`).reply((config: AxiosRequestConfig) => {
        expect(config.headers?.[environment.security.csrfHeaderName]).toBe('');
        return [200, { id: 1 }];
      });

      await ocrService.getResult(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors with custom messages', async () => {
      mockAxios.onPost(`${BASE_URL}/upload`).reply(500, {
        message: 'Server processing error',
      });

      await expect(ocrService.uploadFile(validFile)).rejects.toThrow('Server processing error');
    });

    it('should handle network errors', async () => {
      mockAxios.onPost(`${BASE_URL}/upload`).networkError();

      await expect(ocrService.uploadFile(validFile)).rejects.toThrow('Upload failed');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost(`${BASE_URL}/upload`).reply(400, {
        message: 'Invalid file format',
      });

      await expect(ocrService.uploadFile(validFile)).rejects.toThrow('Invalid file format');
    });
  });

  describe('Pagination and Filtering', () => {
    it('should handle paginated requests with filters', async () => {
      const filters = {
        status: OcrStatus.Completed,
        startDate: '2024-01-01',
        search: 'test',
      };

      mockAxios.onGet(`${BASE_URL}/results`).reply((config: AxiosRequestConfig) => {
        expect(config.params).toEqual({
          page: 1,
          limit: 10,
          ...filters,
        });
        return [200, { data: [], total: 0, page: 1, limit: 10 }];
      });

      await ocrService.getResults(1, 10, filters);
    });
  });
});
