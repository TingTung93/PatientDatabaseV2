import React, { useState } from 'react';
import { Alert } from 'antd';
import { OcrUpload } from './OcrUpload';
import OCRResults from './OCRResults';
import { ErrorBoundary } from '../common/ErrorBoundary';
import type { OcrResult as OcrResultType } from '../../types/ocr';

// Placeholder for the actual API call function
const uploadFileApi = async (file: File): Promise<OcrResultType> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  
  // Simulate potential error
  if (file.name.includes('error')) {
    throw new Error('Simulated server upload error.');
  }

  // Simulate successful response
  return {
    id: Date.now(), // Use a number for the ID
    file_name: file.name,
    file_path: URL.createObjectURL(file), // Simulate a preview URL
    file_size: file.size,
    file_type: file.type,
    status: 'completed' as OcrResultType['status'], // Ensure status matches enum type
    text: `Extracted text for ${file.name}...\nLine 2\nLine 3`,
    confidence: 0.95,
    metadata: { structured_data: { name: 'Test Patient', dob: '1990-01-01' } },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export function OCRContainer() {
  const [ocrResult, setOcrResult] = useState<OcrResultType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadSuccess = (result: OcrResultType) => {
    setOcrResult(result);
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setOcrResult(null);
  };

  const handleReset = () => {
    setOcrResult(null);
    setError(null);
  };

  // Define the onUpload handler for OcrUpload component
  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFileApi(file); // Call the actual (simulated) API
      handleUploadSuccess(result);
    } catch (err) {
      handleUploadError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <ErrorBoundary>
        <div className="mb-4">
          {error && (
            <Alert 
              message="Upload Error" 
              description={error} 
              type="error" 
              showIcon 
              closable 
              onClose={handleReset} 
              className="mb-4"
            />
          )}
          {!ocrResult && (
            <OcrUpload
              // onUpload={handleUpload} // Prop removed, component uses hook internally
            />
          )}
        </div>

        {ocrResult && (
          <div>
            <OCRResults result={ocrResult} onReset={handleReset} />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}

export default OCRContainer; 