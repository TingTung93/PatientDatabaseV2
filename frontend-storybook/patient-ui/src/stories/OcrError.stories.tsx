import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OcrResult } from '../components/ocr/OcrResult';
import { OcrStatus } from '../types/ocr';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component for React Query
const QueryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const meta = {
  title: 'OCR/Error States',
  component: OcrResult,
  decorators: [
    (Story) => (
      <QueryWrapper>
        <Story />
      </QueryWrapper>
    ),
  ],
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return new HttpResponse(null, {
            status: 400,
            statusText: 'Bad Request',
          });
        }),
        http.get('/api/ocr/results', () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error',
          });
        }),
      ],
    },
  },
} satisfies Meta<typeof OcrResult>;

export default meta;
type Story = StoryObj<typeof meta>;

// Upload Error States
export const UploadValidationError: Story = {
  args: {
    result: {
      id: 1,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Invalid file type. Please upload a PDF or image file.'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(
            {
              error: 'Invalid file type',
              details: 'Please upload a PDF or image file'
            },
            { status: 400 }
          );
        })
      ]
    }
  }
};

export const UploadSizeError: Story = {
  args: {
    result: {
      id: 2,
      file_name: 'large_file.pdf',
      file_path: '/uploads/large_file.pdf',
      file_size: 15 * 1024 * 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'File size exceeds maximum limit of 10MB'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(
            {
              error: 'File size exceeds maximum limit of 10MB',
              code: 'FILE_TOO_LARGE',
              details: {
                maxSize: '10MB',
              },
            },
            { status: 400 }
          );
        }),
      ],
    },
  },
};

export const UploadServerError: Story = {
  args: {
    result: {
      id: 3,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Internal server error occurred during file upload'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(
            {
              error: 'Internal server error occurred during file upload',
              code: 'UPLOAD_FAILED',
            },
            { status: 500 }
          );
        }),
      ],
    },
  },
};

export const UploadNetworkError: Story = {
  args: {
    result: {
      id: 4,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Network error occurred during upload'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.error();
        }),
      ],
    },
  },
};

// Results Error States
export const ResultsLoadError: Story = {
  args: {
    result: {
      id: 5,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Failed to load OCR results'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ocr/results', () => {
          return HttpResponse.json(
            {
              error: 'Failed to load OCR results',
              code: 'LOAD_FAILED',
            },
            { status: 500 }
          );
        }),
      ],
    },
  },
};

export const ResultsEmptyState: Story = {
  args: {
    result: {
      id: 6,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Completed,
      text: '',
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ocr/results*', () => {
          return HttpResponse.json({
            data: [],
            total: 0,
            page: 1,
            limit: 10
          });
        }),
      ],
    },
  },
};

export const ResultDetailError: Story = {
  args: {
    result: {
      id: 7,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Result not found'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ocr/results/:id', () => {
          return HttpResponse.json(
            {
              error: 'Result not found',
              code: 'NOT_FOUND',
            },
            { status: 404 }
          );
        }),
      ],
    },
  },
};

// Authentication Error States
export const UnauthorizedError: Story = {
  args: {
    result: {
      id: 8,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Unauthorized access'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ocr/results', () => {
          return HttpResponse.json(
            {
              error: 'Unauthorized access',
              code: 'UNAUTHORIZED',
            },
            { status: 401 }
          );
        }),
      ],
    },
  },
};

export const ForbiddenError: Story = {
  args: {
    result: {
      id: 9,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Access forbidden'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ocr/results', () => {
          return HttpResponse.json(
            {
              error: 'Access forbidden',
              code: 'FORBIDDEN',
            },
            { status: 403 }
          );
        }),
      ],
    },
  },
};

export const RateLimitError: Story = {
  args: {
    result: {
      id: 10,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Rate limit exceeded'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(
            {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
              details: {
                retryAfter: 60,
              },
            },
            { status: 429 }
          );
        }),
      ],
    },
  },
};

export const WebSocketDisconnected: Story = {
  args: {
    result: {
      id: 11,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Processing,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'WebSocket connection lost. Retrying...'
    },
    onRetry: () => {},
    onDelete: () => {}
  }
};

export const MultipleErrors: Story = {
  args: {
    result: {
      id: 12,
      file_name: 'test.pdf',
      file_path: '/uploads/test.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: 'Multiple errors occurred'
    },
    onRetry: () => {},
    onDelete: () => {}
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/ocr/upload', () => {
          return HttpResponse.json(
            {
              error: 'Upload failed',
              code: 'UPLOAD_ERROR'
            },
            { status: 500 }
          );
        }),
        http.get('/api/ocr/results*', () => {
          return HttpResponse.json(
            {
              error: 'Failed to load results',
              code: 'FETCH_ERROR'
            },
            { status: 500 }
          );
        }),
      ],
    },
  },
}; 