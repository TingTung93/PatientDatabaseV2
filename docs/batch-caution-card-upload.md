# Batch Caution Card Upload Documentation

## User Guide

### Overview
The Batch Caution Card Upload feature allows users to efficiently upload multiple caution card files simultaneously through the frontend interface.

### Using the Upload Interface
1. Navigate to the caution cards section in `frontend-storybook/patient-ui`
2. Click the "Upload" button or drag files to the upload area
3. Select multiple caution card image files (supported formats: PNG, JPG)
4. The system will validate each file for:
   - File type (PNG/JPG only)
   - File size (configurable maximum)
   - Basic image integrity

### Validation Feedback
- Invalid files are immediately rejected with specific error messages
- A status indicator shows upload progress for each file
- Success/failure notifications appear for each processed file

### Error Handling
- The interface clearly displays validation errors
- If any file in the batch fails validation, you can:
  - Remove the invalid file
  - Replace it with a valid file
  - Continue uploading the valid files

## API Endpoint Documentation

### Endpoint Details
```
POST /api/v1/patients/:patientId/caution-cards
```

### Request Format
- **Content-Type:** multipart/form-data
- **Required Parameters:**
  - `patientId` (URL parameter): Patient identifier
  - `cautionCardFile` (form field): Array of files to upload

### Response Format
```json
{
  "success": boolean,
  "message": string,
  "results": [
    {
      "filename": string,
      "status": "success" | "error",
      "message": string,
      "cardId?: string
    }
  ]
}
```

### Status Codes
- `200`: Successful upload and processing
- `400`: Validation error (invalid file type, size, or format)
- `401`: Unauthorized
- `403`: Malware detected
- `413`: File too large
- `500`: Server error

### Error Responses
```json
{
  "success": false,
  "message": string,
  "errors": [
    {
      "filename": string,
      "code": string,
      "message": string
    }
  ]
}
```

## Configuration

### Environment Variables
```
# File Processing
MAX_FILE_SIZE=5242880           # Maximum file size in bytes (5MB default)
ALLOWED_MIME_TYPES=image/jpeg,image/png
UPLOAD_TEMP_DIR=/tmp/uploads    # Temporary storage for uploads

# Malware Scanning
CLAMAV_HOST=localhost           # ClamAV daemon host
CLAMAV_PORT=3310               # ClamAV daemon port
```

### File Validation Rules
- Maximum file size: 5MB (configurable)
- Allowed file types: PNG, JPG
- Maximum files per batch: 10 (configurable)

## Technical Overview

### Processing Workflow
1. **Frontend Validation**
   - File type check
   - Size validation
   - Basic image integrity verification

2. **Upload Processing**
   - Multipart form data handling
   - Temporary file storage
   - ClamAV virus scanning

3. **Post-Processing**
   - Image optimization
   - Metadata extraction
   - Database record creation

### Security Measures
1. **File Validation**
   - Strict MIME type checking
   - File extension validation
   - Content type verification

2. **Malware Protection**
   - ClamAV integration
   - Real-time scanning
   - Quarantine of suspicious files

3. **Upload Security**
   - Rate limiting
   - Authentication check
   - Session validation

### Dependencies
- ClamAV for virus scanning
- Image processing libraries
- Temporary storage system

### Error Handling
- Graceful fallback for failed scans
- Detailed error reporting
- Failed upload cleanup
- Partial batch success handling