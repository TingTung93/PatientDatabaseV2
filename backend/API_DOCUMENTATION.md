# Patient Information API Documentation

## Overview
This API provides endpoints for managing patient records, medical reports, and caution cards in a healthcare information system, with a focus on OCR processing for medical documents.

## Base URL
`/api/v1`

## Authentication
Authentication is not implemented in the current version. All endpoints are publicly accessible.

## Global Headers
```
Content-Type: application/json
Accept: application/json
```

## Error Handling
All endpoints follow a consistent error response format:
```json
{
  "status": "error",
  "message": "Description of the error",
  "error": "Optional detailed error information"
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## Rate Limiting
No rate limiting is currently implemented.

## Endpoints

### Health Check
- **URL:** `/health`
- **Method:** `GET`
- **Description:** Check if the API is running
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "status": "healthy"
    }
    ```

### Patients

#### Get All Patients
- **URL:** `/patients`
- **Method:** `GET`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
- **Success Response:**
  - **Code:** 200
  - **Content:** List of patients with pagination info

#### Search Patients
- **URL:** `/patients/search`
- **Method:** `GET`
- **Query Parameters:**
  - `query` or `name`: Search term for patient name
  - `dateOfBirth` (optional): Filter by date of birth (YYYY-MM-DD)
  - `bloodType` (optional): Filter by blood type
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
- **Success Response:**
  - **Code:** 200
  - **Content:** List of matching patients with pagination info

#### Get Patient by ID
- **URL:** `/patients/:id`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** Patient details
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Patient not found" }`

#### Create Patient
- **URL:** `/patients`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "Male",
    "bloodType": "A+",
    "contactNumber": "555-1234",
    "email": "john.doe@example.com",
    "address": "123 Main St",
    "medicalRecordNumber": "MRN12345",
    "notes": "Patient notes"
  }
  ```
- **Success Response:**
  - **Code:** 201
  - **Content:** Created patient with ID

#### Update Patient
- **URL:** `/patients/:id`
- **Method:** `PUT`
- **Body:** Same as create patient (fields to update)
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated patient
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Patient not found" }`

#### Delete Patient
- **URL:** `/patients/:id`
- **Method:** `DELETE`
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Patient deleted successfully" }`
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Patient not found" }`

#### Get Patient Reports
- **URL:** `/patients/:id/reports`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** List of reports for the patient

#### Get Patient Caution Cards
- **URL:** `/patients/:id/caution-cards`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** List of caution cards for the patient

#### Link Report to Patient
- **URL:** `/patients/:id/link-report`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "reportId": 123
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Report linked successfully" }`

#### Link Caution Card to Patient
- **URL:** `/patients/:id/link-caution-card`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "cardId": 123,
    "updatedBy": "user123"
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Caution card linked successfully" }`

### Reports

#### Get All Reports
- **URL:** `/reports`
- **Method:** `GET`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
  - `type` (optional): Filter by report type
  - `patientId` (optional): Filter by patient ID
  - `dateFrom` (optional): Filter by date range start
  - `dateTo` (optional): Filter by date range end
- **Success Response:**
  - **Code:** 200
  - **Content:** List of reports with pagination info

#### Get Report by ID
- **URL:** `/reports/:id`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** Report details
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Report not found" }`

#### Upload Report
- **URL:** `/reports/upload`
- **Method:** `POST`
- **Form Data:**
  - `file`: The report file
  - `type`: Report type
  - `patientId` (optional): Patient ID to link report to
- **Success Response:**
  - **Code:** 201
  - **Content:** Created report with ID

#### Update Report
- **URL:** `/reports/:id`
- **Method:** `PUT`
- **Body:**
  ```json
  {
    "type": "blood",
    "patientId": 123,
    "ocrText": "Report content...",
    "status": "completed",
    "metadata": {}
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated report
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Report not found" }`

#### Update Report Status
- **URL:** `/reports/:id/status`
- **Method:** `PUT`
- **Body:**
  ```json
  {
    "status": "completed",
    "updatedBy": "user123"
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated report

#### Get Report Attachments
- **URL:** `/reports/:id/attachments`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** List of attachments for the report

#### Add Report Attachment
- **URL:** `/reports/:id/attachments`
- **Method:** `POST`
- **Form Data:**
  - `file`: The attachment file
- **Success Response:**
  - **Code:** 201
  - **Content:** Created attachment with ID

#### Delete Report Attachment
- **URL:** `/reports/attachments/:attachmentId`
- **Method:** `DELETE`
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Attachment deleted successfully" }`

#### Delete Report
- **URL:** `/reports/:id`
- **Method:** `DELETE`
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Report deleted successfully" }`
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Report not found" }`

### Caution Cards

#### Get All Caution Cards
- **URL:** `/caution-cards`
- **Method:** `GET`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 20)
  - `status` (optional): Filter by status
  - `patientId` (optional): Filter by patient ID
  - `dateFrom` (optional): Filter by date range start
  - `dateTo` (optional): Filter by date range end
  - `reviewed` (optional): Filter by reviewed status (true/false)
  - `unreviewed` (optional): Filter by unreviewed status (true/false)
- **Success Response:**
  - **Code:** 200
  - **Content:** List of caution cards with pagination info

#### Get Orphaned Caution Cards
- **URL:** `/caution-cards/orphaned`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** List of orphaned caution cards

#### Search Caution Cards
- **URL:** `/caution-cards/search`
- **Method:** `GET`
- **Query Parameters:**
  - `q`: Search term
- **Success Response:**
  - **Code:** 200
  - **Content:** List of matching caution cards

#### Get Caution Card by ID
- **URL:** `/caution-cards/:id`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** Caution card details
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Caution card not found" }`

#### Process Caution Card
- **URL:** `/caution-cards/process`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Description:** Upload and process a caution card image using OCR
- **Parameters:**
  - **Form Data:**
    - `file` (required): The image file (JPEG, PNG, or TIFF)
    - `patientId` (optional): ID of the patient to link the card to
- **File Restrictions:**
  - Maximum file size: 10MB
  - Allowed file types: image/jpeg, image/png, image/tiff
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "status": "success",
      "data": {
        "text": "Extracted OCR text",
        "confidence": "high|medium|low",
        "fields": {
          "bloodType": "detected blood type",
          "antibodies": ["detected antibodies"],
          "transfusionRequirements": ["detected requirements"]
        }
      }
    }
    ```
- **Error Responses:**
  - **Code:** 400
    ```json
    {
      "status": "error",
      "message": "No file uploaded"
    }
    ```
  - **Code:** 400
    ```json
    {
      "status": "error",
      "message": "Invalid file type. Only JPEG, PNG, and TIF files are allowed."
    }
    ```
  - **Code:** 500
    ```json
    {
      "status": "error",
      "message": "OCR processing failed",
      "error": "Detailed error message"
    }
    ```

#### Get OCR Results
- **URL:** `/caution-cards/results/:imageId`
- **Method:** `GET`
- **Description:** Retrieve OCR results for a processed image
- **URL Parameters:**
  - `imageId` (required): The ID of the processed image
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "status": "success",
      "data": {
        "patient": {
          "id": "patient_id",
          "name": "patient_name",
          // other patient fields
        },
        "cautionCardData": {
          // OCR extracted data
        },
        "ocrConfidence": "high|medium|low"
      }
    }
    ```
- **Error Responses:**
  - **Code:** 404
    ```json
    {
      "status": "error",
      "message": "No OCR results found for this image"
    }
    ```
  - **Code:** 500
    ```json
    {
      "status": "error",
      "message": "Failed to retrieve OCR results",
      "error": "Detailed error message"
    }
    ```

#### Update Caution Card
- **URL:** `/caution-cards/:id`
- **Method:** `PUT`
- **Body:**
  ```json
  {
    "bloodType": "AB+",
    "antibodies": ["Anti-K", "Anti-D"],
    "transfusionRequirements": ["Washed", "Irradiated"],
    "status": "reviewed",
    "patientId": 123,
    "ocrText": "Card content...",
    "metadata": {}
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated caution card
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Caution card not found" }`

#### Mark Caution Card as Reviewed
- **URL:** `/caution-cards/:id/review`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "reviewedBy": "user123"
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated caution card

#### Link Caution Card to Patient
- **URL:** `/caution-cards/:id/link`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "patientId": 123,
    "updatedBy": "user123"
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** Updated caution card
- **Error Response:**
  - **Code:** 400
  - **Content:** `{ "message": "patientId is required" }`

#### Delete Caution Card
- **URL:** `/caution-cards/:id`
- **Method:** `DELETE`
- **Body:**
  ```json
  {
    "updatedBy": "user123"
  }
  ```
- **Success Response:**
  - **Code:** 200
  - **Content:** `{ "message": "Caution card deleted successfully" }`
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "message": "Caution card not found" }`

## WebSocket Events
Currently, no WebSocket events are implemented.

## Development

### Environment Variables
The following environment variables can be configured:
- `PORT`: Server port (default: 3001)
- `LOG_LEVEL`: Logging level (default: 'info')
- `LOG_FILENAME`: Log file path (default: 'logs/app.log')
- `MAX_FILE_SIZE`: Maximum file upload size in bytes (default: 10485760)
- `NODE_ENV`: Environment mode ('development' or 'production')

### Logging
The application uses Winston for logging with the following configuration:
- Log levels: error, warn, info, debug
- Log format: JSON with timestamps
- Production: File-based logging only
- Development: Console and file logging

### File Storage
Uploaded files are stored in:
- Caution Cards: `/uploads/caution-cards/`
- File naming: `card_image-[timestamp]-[random]-[extension]`

## Future Enhancements
1. Authentication and authorization
2. Rate limiting
3. WebSocket support for real-time OCR progress
4. Additional endpoints for patient management
5. Enhanced error handling and validation
6. Caching layer for OCR results

## Support
For issues or questions, please file a bug report in the project repository. 