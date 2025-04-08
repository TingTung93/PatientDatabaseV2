# Frontend Integration Guide

## Overview
This guide provides comprehensive instructions for integrating a frontend application with the Patient Information API, with a specific focus on OCR processing functionality for caution cards.

## Getting Started

### Prerequisites
- Node.js (version 14+)
- Package manager (npm or yarn)
- Modern web browser with WebSocket support

### Project Setup
```bash
# Create a new React TypeScript project
npx create-react-app patient-ui --template typescript

# OR using Vite (recommended)
npm create vite@latest patient-ui -- --template react-ts

# Install required dependencies
npm install axios         # HTTP client
npm install @tanstack/react-query  # Server state management
npm install react-router-dom       # Routing
npm install formik yup            # Form handling and validation
npm install date-fns             # Date formatting
npm install @mui/material @emotion/react @emotion/styled  # UI components
```

## API Client Configuration

### Base API Client
```typescript
// src/api/client.ts
import axios, { AxiosError, AxiosInstance } from 'axios';

const baseURL = process.env.NODE_ENV === 'production' 
  ? '/api/v1' 
  : 'http://localhost:3001/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Error in request configuration
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### OCR Service Implementation
```typescript
// src/api/ocrService.ts
import apiClient from './client';

export interface OCRResponse {
  status: 'success' | 'error';
  data?: {
    text: string;
    confidence: 'high' | 'medium' | 'low';
    fields: {
      bloodType?: string;
      antibodies?: string[];
      transfusionRequirements?: string[];
    };
  };
  error?: string;
  message?: string;
}

export const ocrService = {
  // Upload and process caution card
  processCautionCard: async (file: File, patientId?: string): Promise<OCRResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (patientId) {
      formData.append('patientId', patientId);
    }

    const response = await apiClient.post<OCRResponse>('/caution-cards/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get OCR results for a specific image
  getOCRResults: async (imageId: string): Promise<OCRResponse> => {
    const response = await apiClient.get<OCRResponse>(`/caution-cards/results/${imageId}`);
    return response.data;
  }
};
```

## React Query Integration

### Custom Hooks
```typescript
// src/hooks/useOCR.ts
import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ocrService, OCRResponse } from '../api/ocrService';
import { AxiosError } from 'axios';

export const useProcessCautionCard = () => {
  return useMutation<
    OCRResponse, 
    AxiosError,
    { file: File; patientId?: string }
  >({
    mutationFn: ({ file, patientId }) => 
      ocrService.processCautionCard(file, patientId),
  });
};

export const useOCRResults = (
  imageId: string,
  options?: UseQueryOptions<OCRResponse, AxiosError>
) => {
  return useQuery<OCRResponse, AxiosError>({
    queryKey: ['ocrResults', imageId],
    queryFn: () => ocrService.getOCRResults(imageId),
    enabled: !!imageId,
    ...options,
  });
};
```

## Component Implementation

### File Upload Component
```typescript
// src/components/CautionCardUpload.tsx
import React, { useCallback } from 'react';
import { useProcessCautionCard } from '../hooks/useOCR';

interface Props {
  onSuccess?: (response: OCRResponse) => void;
  onError?: (error: Error) => void;
  patientId?: string;
}

export const CautionCardUpload: React.FC<Props> = ({ 
  onSuccess, 
  onError,
  patientId 
}) => {
  const { mutate, isLoading } = useProcessCautionCard();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    mutate(
      { file, patientId },
      {
        onSuccess: (data) => {
          onSuccess?.(data);
        },
        onError: (error) => {
          onError?.(error);
        },
      }
    );
  }, [mutate, onSuccess, onError, patientId]);

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/tiff"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <div>Processing image...</div>}
    </div>
  );
};
```

### OCR Results Display Component
```typescript
// src/components/OCRResults.tsx
import React from 'react';
import { useOCRResults } from '../hooks/useOCR';

interface Props {
  imageId: string;
}

export const OCRResults: React.FC<Props> = ({ imageId }) => {
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useOCRResults(imageId);

  if (isLoading) return <div>Loading results...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h3>OCR Results</h3>
      <div>
        <strong>Confidence:</strong> {data.data?.confidence}
      </div>
      <div>
        <strong>Blood Type:</strong> {data.data?.fields.bloodType}
      </div>
      {data.data?.fields.antibodies && (
        <div>
          <strong>Antibodies:</strong>
          <ul>
            {data.data.fields.antibodies.map((antibody, index) => (
              <li key={index}>{antibody}</li>
            ))}
          </ul>
        </div>
      )}
      {data.data?.fields.transfusionRequirements && (
        <div>
          <strong>Transfusion Requirements:</strong>
          <ul>
            {data.data.fields.transfusionRequirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### Usage Example
```typescript
// src/pages/CautionCardPage.tsx
import React, { useState } from 'react';
import { CautionCardUpload } from '../components/CautionCardUpload';
import { OCRResults } from '../components/OCRResults';
import { OCRResponse } from '../api/ocrService';

export const CautionCardPage: React.FC = () => {
  const [processedImageId, setProcessedImageId] = useState<string>();

  const handleUploadSuccess = (response: OCRResponse) => {
    if (response.status === 'success') {
      // Assuming the response includes an imageId
      setProcessedImageId(response.data?.imageId);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload failed:', error);
    // Handle error (e.g., show notification)
  };

  return (
    <div>
      <h2>Caution Card Processing</h2>
      <CautionCardUpload
        onSuccess={handleUploadSuccess}
        onError={handleUploadError}
      />
      {processedImageId && <OCRResults imageId={processedImageId} />}
    </div>
  );
};
```

## Error Handling

### Error Types
```typescript
// src/types/errors.ts
export interface APIError {
  status: 'error';
  message: string;
  error?: string;
}

export class OCRProcessingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'OCRProcessingError';
  }
}
```

### Error Boundary Component
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing

### Component Testing Example
```typescript
// src/components/__tests__/CautionCardUpload.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CautionCardUpload } from '../CautionCardUpload';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('CautionCardUpload', () => {
  it('handles file upload successfully', async () => {
    const onSuccess = jest.fn();
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

    render(
      <QueryClientProvider client={queryClient}>
        <CautionCardUpload onSuccess={onSuccess} />
      </QueryClientProvider>
    );

    const input = screen.getByRole('input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

## Best Practices

### 1. State Management
- Use React Query for server state
- Use local state for UI-specific state
- Implement proper loading and error states

### 2. Performance
- Implement proper caching strategies
- Use debouncing for frequent operations
- Optimize image uploads (compression if needed)
- Implement retry mechanisms for failed requests

### 3. Error Handling
- Use error boundaries for component-level errors
- Implement proper error feedback UI
- Log errors appropriately
- Handle network errors gracefully

### 4. Security
- Validate file types and sizes before upload
- Sanitize API responses
- Implement proper CORS handling
- Plan for future authentication integration

### 5. Accessibility
- Provide proper ARIA labels
- Ensure keyboard navigation
- Show clear loading and error states
- Support screen readers

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Environment Configuration
```typescript
// .env.development
VITE_API_URL=http://localhost:3001/api/v1

// .env.production
VITE_API_URL=/api/v1
```

## Future Considerations

1. **Authentication Integration**
   - Prepare for token-based auth
   - Implement auth interceptors
   - Add protected routes

2. **WebSocket Integration**
   - Real-time OCR progress updates
   - Connection management
   - Reconnection strategies

3. **Performance Optimization**
   - Implement request caching
   - Add service worker
   - Optimize bundle size

4. **Enhanced Error Handling**
   - Retry strategies
   - Offline support
   - Better error reporting

5. **Monitoring**
   - Error tracking
   - Performance monitoring
   - Usage analytics

## Support
For technical issues or questions, please refer to the project repository or contact the development team. 