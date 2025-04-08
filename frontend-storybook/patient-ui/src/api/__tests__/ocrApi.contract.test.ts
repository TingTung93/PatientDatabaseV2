import { http, HttpResponse, type PathParams, type StrictResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ocrService } from '../../services/ocrService';
import { OcrResult, OcrUploadResponse, OcrStatus } from '../../types/ocr'; // Import OcrStatus

// Define expected API shapes
interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Setup MSW server
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('OCR API Contract Tests', () => {
  describe('Upload Endpoint', () => {
    const validUploadResponse: OcrUploadResponse = {
      id: 1,
      status: OcrStatus.Pending, // Use enum
      // message: 'Upload successful' // Property does not exist on type
      file_name: 'test.jpg', // Add required file_name
    };

    it('should match upload request/response contract', async () => {
      server.use(
        http.post('/api/ocr/upload', async ({ request }) => {
          // Verify request format
          const formData = await request.formData();
          expect(formData.has('file')).toBe(true);

          // Verify content type
          expect(request.headers.get('Content-Type')).toContain('multipart/form-data');

          return HttpResponse.json(validUploadResponse);
        })
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const response = await ocrService.uploadFile(file);

      // Verify response shape
      expect(response).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
          file_name: expect.any(String), // Check for file_name instead of message
        })
      );
    });

    it('should handle upload validation errors correctly', async () => {
      const errorResponse: ApiError = {
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        details: {
          allowedTypes: ['image/jpeg', 'image/png'],
        },
      };

      server.use(
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(errorResponse, { status: 400 });
        })
      );

      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await expect(ocrService.uploadFile(invalidFile)).rejects.toMatchObject({
        message: expect.any(String),
        code: expect.any(String),
      });
    });
  });

  describe('Results Endpoint', () => {
    const validResult: OcrResult = {
      id: 1,
      file_name: 'test.jpg',
      file_path: '/test.jpg',
      file_size: 1024,
      file_type: 'image/jpeg',
      status: OcrStatus.Completed, // Use enum
      text: 'Sample OCR text',
      confidence: 0.95,
      metadata: {},
      created_at: '2024-04-05T12:00:00Z',
      updated_at: '2024-04-05T12:01:00Z',
      // processed_at: '2024-04-05T12:01:00Z' // Property does not exist
    };

    it('should match get results request/response contract', async () => {
      const validResponse: PaginatedResponse<OcrResult> = {
        data: [validResult],
        total: 1,
        page: 1,
        limit: 10,
      };

      server.use(
        http.get('/api/ocr/results', ({ request }) => {
          const url = new URL(request.url);
          // Verify query parameters
          expect(url.searchParams.has('page')).toBe(true);
          expect(url.searchParams.has('limit')).toBe(true);

          return HttpResponse.json(validResponse);
        })
      );

      // Pass arguments directly, not as an object
      const response = await ocrService.getResults(1, 10);

      // Verify response shape
      expect(response).toEqual(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              file_name: expect.any(String),
              status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
              text: expect.any(String),
              confidence: expect.any(Number),
            }),
          ]),
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
        })
      );
    });

    it('should match get single result request/response contract', async () => {
      server.use(
        http.get('/api/ocr/results/:id', ({ params }) => {
          // Verify URL parameter
          expect(params['id']).toBe('1');

          return HttpResponse.json(validResult);
        })
      );

      const response = await ocrService.getResult(1);

      // Verify response shape
      expect(response).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          file_name: expect.any(String),
          file_path: expect.any(String),
          file_size: expect.any(Number),
          file_type: expect.any(String),
          status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
          text: expect.any(String),
          confidence: expect.any(Number),
          metadata: expect.any(Object),
          created_at: expect.any(String),
          updated_at: expect.any(String),
          // processed_at: expect.any(String) // Property does not exist
        })
      );
    });
  });

  describe('Delete Endpoint', () => {
    it('should match delete request/response contract', async () => {
      server.use(
        http.delete('/api/ocr/results/:id', ({ params }) => {
          // Verify URL parameter
          expect(params['id']).toBe('1');

          return new HttpResponse(null, { status: 204 });
        })
      );

      await expect(ocrService.deleteResult(1)).resolves.toBeUndefined();
    });

    it('should handle delete errors correctly', async () => {
      const errorResponse: ApiError = {
        error: 'Result not found',
        code: 'NOT_FOUND',
      };

      server.use(
        http.delete('/api/ocr/results/:id', () => {
          return HttpResponse.json(errorResponse, { status: 404 });
        })
      );

      await expect(ocrService.deleteResult(999)).rejects.toMatchObject({
        message: expect.any(String),
        code: 'NOT_FOUND',
      });
    });
  });

  describe('Retry Endpoint', () => {
    it('should match retry request/response contract', async () => {
      const retryResponse: OcrUploadResponse = {
        id: 1,
        status: OcrStatus.Pending, // Use enum
        // message: 'Retry initiated' // Property does not exist on type
        file_name: 'test.jpg', // Add required file_name
      };

      server.use(
        http.post('/api/ocr/results/:id/retry', ({ params }) => {
          // Verify URL parameter
          expect(params['id']).toBe('1');

          return HttpResponse.json(retryResponse);
        })
      );

      const response = await ocrService.retryProcessing(1);

      // Verify response shape
      expect(response).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          status: expect.stringMatching(/^(pending|processing)$/),
          file_name: expect.any(String), // Check for file_name instead of message
        })
      );
    });
  });

  describe('Error Handling', () => {
    const errorCases = [
      {
        status: 400,
        error: {
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: { field: 'file', message: 'Required' },
        },
      },
      {
        status: 401,
        error: {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      },
      {
        status: 403,
        error: {
          error: 'Forbidden',
          code: 'FORBIDDEN',
        },
      },
      {
        status: 404,
        error: {
          error: 'Not found',
          code: 'NOT_FOUND',
        },
      },
      {
        status: 429,
        error: {
          error: 'Too many requests',
          code: 'RATE_LIMIT',
          details: { retryAfter: 60 },
        },
      },
      {
        status: 500,
        error: {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
    ];

    errorCases.forEach(({ status, error }) => {
      it(`should handle ${status} errors correctly`, async () => {
        server.use(
          http.post('/api/ocr/upload', () => {
            return HttpResponse.json(error, { status });
          })
        );

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        await expect(ocrService.uploadFile(file)).rejects.toMatchObject({
          message: expect.any(String),
          code: error.code,
        });
      });
    });
  });
});
