import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { RequestHandler } from 'msw';
import { CautionCardUpload } from '../components/caution-cards/CautionCardUpload';

// Mock the file validation service
jest.mock('../services/FileValidationService', () => ({
  fileValidationService: {
    validateFile: () => null, // No validation errors
    getAcceptString: () => '.png,.jpg,.jpeg',
    getMaxFileSizeMB: () => 5
  },
  FileTypeCategory: {
    CautionCard: 'CAUTION_CARD'
  }
}));

const server = setupServer(
  // Mock successful upload
  http.post('/api/v1/patients/:patientId/caution-cards', async ({ params, request }) => {
    const { patientId } = params;
    
    // Verify FormData contains the correct field name and file
    const formData = await request.formData();
    if (!formData.has('cautionCardFile')) {
      return HttpResponse.json(
        { message: 'Missing cautionCardFile field' },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      {
        id: '123',
        message: 'Caution card uploaded and processed successfully.',
        filename: 'test-caution-card.jpg'
      },
      { status: 201 }
    );
  }),

  // Mock virus detection
  http.post('/api/v1/patients/999/caution-cards', async () => {
    return HttpResponse.json(
      { message: 'Malware detected in the uploaded file. Upload rejected.' },
      { status: 400 }
    );
  }),

  // Mock file size error
  http.post('/api/v1/patients/888/caution-cards', async () => {
    return HttpResponse.json(
      { message: 'File too large. Maximum size: 5 MB.' },
      { status: 400 }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CautionCardUpload Integration', () => {
  const mockFile = new File(['test content'], 'test-caution-card.jpg', { type: 'image/jpeg' });
  
  it('successfully uploads a caution card', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    render(
      <CautionCardUpload
        patientId="123"
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    // Find the file input and upload a file
    const fileInput = screen.getByTestId('caution-card-upload');
    await userEvent.upload(fileInput, mockFile);

    // Click the upload button
    const uploadButton = screen.getByRole('button', { name: /upload caution card/i });
    await userEvent.click(uploadButton);

    // Wait for success
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it('handles malware detection', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    render(
      <CautionCardUpload
        patientId="999" // This ID triggers the malware mock
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    const fileInput = screen.getByTestId('caution-card-upload');
    await userEvent.upload(fileInput, mockFile);

    const uploadButton = screen.getByRole('button', { name: /upload caution card/i });
    await userEvent.click(uploadButton);

    // Wait for error message
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'Malware detected in the uploaded file. Upload rejected.'
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/malware detected/i)).toBeInTheDocument();
  });

  it('handles file size limits', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    render(
      <CautionCardUpload
        patientId="888" // This ID triggers the file size error mock
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    const fileInput = screen.getByTestId('caution-card-upload');
    await userEvent.upload(fileInput, mockFile);

    const uploadButton = screen.getByRole('button', { name: /upload caution card/i });
    await userEvent.click(uploadButton);

    // Wait for error message
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'File too large. Maximum size: 5 MB.'
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });
});