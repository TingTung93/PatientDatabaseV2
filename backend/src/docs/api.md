# Patient Information System API Documentation

## Base URL
```
http://localhost:5000/v1
```

## Endpoints

### Patients

#### Get All Patients
```http
GET /patients
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Number of items per page (default: 10)

Response:
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "middleName": "string",
      "medicalRecordNumber": "string",
      "birthDate": "date",
      "bloodType": "string",
      "phenotype": "string",
      "antibodies": ["string"],
      "antigens": ["string"],
      "transfusionRequirements": ["string"],
      "comments": [
        {
          "id": "uuid",
          "text": "string",
          "createdAt": "date",
          "userId": "uuid"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 1,
    "total": 1
  }
}
```

#### Get Patient by ID
```http
GET /patients/:id
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string",
    "middleName": "string",
    "medicalRecordNumber": "string",
    "birthDate": "date",
    "bloodType": "string",
    "phenotype": "string",
    "antibodies": ["string"],
    "antigens": ["string"],
    "transfusionRequirements": ["string"],
    "comments": [
      {
        "id": "uuid",
        "text": "string",
        "createdAt": "date",
        "userId": "uuid"
      }
    ]
  }
}
```

#### Create Patient
```http
POST /patients
```

Request Body:
```json
{
  "firstName": "string",
  "lastName": "string",
  "middleName": "string",
  "medicalRecordNumber": "string",
  "birthDate": "date",
  "bloodType": "string",
  "phenotype": "string",
  "antibodies": ["string"],
  "antigens": ["string"],
  "transfusionRequirements": ["string"]
}
```

#### Update Patient
```http
PUT /patients/:id
```

Request Body: Same as Create Patient

#### Delete Patient
```http
DELETE /patients/:id
```

### Reports

#### Upload Report
```http
POST /reports/upload
```

Content-Type: `multipart/form-data`

Form Fields:
- `report`: Text file containing patient information

Response:
```json
{
  "status": "success",
  "message": "Successfully processed X patients",
  "data": [
    {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "medicalRecordNumber": "string",
      "birthDate": "date",
      "bloodType": "string",
      "phenotype": "string",
      "antibodies": ["string"],
      "antigens": ["string"],
      "transfusionRequirements": ["string"]
    }
  ]
}
```

#### Process Report with OCR
```http
POST /reports/report-ocr
```

Content-Type: `multipart/form-data`

Form Fields:
- `report`: Text file containing patient information

Response: Same as Upload Report

#### Get All Reports
```http
GET /reports
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `patientId` (optional): Filter by patient ID
- `reportType` (optional): Filter by report type

#### Get Report by ID
```http
GET /reports/:reportId
```

#### Download Report
```http
GET /reports/:reportId/download
```

#### Delete Report
```http
DELETE /reports/:reportId
```

#### Get Report Processing Status
```http
GET /reports/:reportId/status
```

Response:
```json
{
  "status": "pending|processing|completed|failed",
  "error": "string (if failed)",
  "ocrComplete": boolean
}
```

### Transfusion Requirements

#### Get All Transfusion Requirements
```http
GET /transfusion
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `patientId` (optional): Filter by patient ID

#### Get Transfusion Requirement by ID
```http
GET /transfusion/:id
```

#### Create Transfusion Requirement
```http
POST /transfusion
```

Request Body:
```json
{
  "patientId": "uuid",
  "bloodType": "string",
  "units": "number",
  "crossmatchRequired": "boolean",
  "specialRequirements": ["string"]
}
```

#### Update Transfusion Requirement
```http
PUT /transfusion/:id
```

Request Body: Same as Create Transfusion Requirement

#### Delete Transfusion Requirement
```http
DELETE /transfusion/:id
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Error message description"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "error": "Error details (in development mode)"
}
``` 