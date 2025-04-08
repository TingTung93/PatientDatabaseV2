# File Upload Documentation

## Overview

This documentation covers the file upload functionality in the Patient UI, focusing on caution card uploads and the underlying components that enable this feature. The system provides a robust file upload experience with OCR processing capabilities and real-time progress tracking.

## Components

### CautionCardUpload

The `CautionCardUpload` component provides a specialized interface for uploading patient caution cards with integrated OCR processing.

#### Props

- `patientId` (number): The ID of the patient the caution card belongs to

#### Features

- File selection for caution card images
- Blood type input field
- Real-time OCR processing with progress tracking
- Error handling and validation
- Automatic form reset after successful upload

#### Example Usage

```tsx
import { CautionCardUpload } from './components/caution-cards/CautionCardUpload';

function PatientCautionCard({ patientId }) {
  return (
    <CautionCardUpload patientId={patientId} />
  );
}
```

## Services

The file upload system is supported by three core services:

### ConfigService

Manages configuration settings for file uploads, including:
- Allowed file types
- Maximum file size limits
- Upload endpoints

### FileValidationService

Handles file validation before upload:
- File type verification
- Size limit checking
- File integrity validation

### FileUploadService

Manages the file upload process:
- File upload to server
- Progress tracking
- Error handling
- Upload cancellation

## OCR Integration

The system includes OCR (Optical Character Recognition) processing for uploaded documents:

### Features

- Automatic document text extraction
- Real-time progress tracking (0-100%)
- Status polling with progress callbacks
- Error handling for failed OCR processing

### OCR Process Flow

1. File is uploaded and validated
2. OCR processing begins with a unique job ID
3. Progress is tracked and displayed to user
4. Results are processed and stored with the caution card

## Error Handling

The system implements comprehensive error handling:

- Validation errors (file type, size)
- Network errors during upload
- OCR processing failures
- Server-side errors

Error messages are displayed to users with appropriate actions for resolution.

## Progress Tracking

Users receive real-time feedback during the upload process:

- File upload progress
- OCR processing status
- Visual progress bar
- Status messages
- Disabled controls during processing

## Best Practices

When implementing file uploads:

1. Always validate files before upload
2. Provide clear feedback during processing
3. Handle errors gracefully with user-friendly messages
4. Implement proper cleanup after successful uploads
5. Disable form controls during active uploads

## Security Considerations

- Implement proper file type validation
- Enforce file size limits
- Sanitize file names
- Validate file content
- Use secure upload endpoints
- Implement proper authentication

## Configuration Options

The file upload system can be configured through `fileUploadConfig.ts`. Common configuration options include:

```typescript
{
  maxFileSize: number;  // Maximum file size in bytes
  allowedTypes: string[];  // Array of allowed MIME types
  uploadEndpoint: string;  // API endpoint for file uploads
  ocrEnabled: boolean;  // Enable/disable OCR processing
  retryAttempts: number;  // Number of retry attempts on failure
}
```

Note: Specific configuration values should be set according to your environment and requirements.