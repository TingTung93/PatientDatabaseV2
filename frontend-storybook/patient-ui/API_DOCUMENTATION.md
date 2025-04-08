# Patient Information API Documentation

## Overview
This API provides endpoints for managing patient records, medical reports, and caution cards in a healthcare information system.

## Base URL
`/api`

## Authentication
Authentication is not implemented in the current version.

## Endpoints

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

#### Process Caution Card Upload
- **URL:** `/caution-cards/process`
- **Method:** `POST`
- **Form Data:**
  - `file`: The caution card file
  - `bloodType` (optional): Blood type
  - `antibodies` (optional): JSON array of antibodies
  - `transfusionRequirements` (optional): JSON array of transfusion requirements
- **Success Response:**
  - **Code:** 201
  - **Content:** Created caution card with ID

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

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## Data Types
### Patient
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "bloodType": "A+",
  "contactNumber": "555-1234",
  "email": "john.doe@example.com",
  "address": "123 Main St",
  "medicalRecordNumber": "MRN12345",
  "notes": "Patient notes",
  "created_at": "2023-06-01T12:00:00Z",
  "updated_at": "2023-06-01T12:00:00Z"
}
```

### Report
```json
{
  "id": 1,
  "type": "blood",
  "file_name": "blood_test.pdf",
  "file_path": "/path/to/file.pdf",
  "file_size": 1024,
  "file_type": "application/pdf",
  "patient_id": 1,
  "ocr_text": "Report content...",
  "metadata": {},
  "status": "completed",
  "created_at": "2023-06-01T12:00:00Z",
  "updated_at": "2023-06-01T12:00:00Z"
}
```

### Caution Card
```json
{
  "id": 1,
  "file_name": "caution_card.pdf",
  "file_path": "/path/to/file.pdf",
  "file_size": 1024,
  "file_type": "application/pdf",
  "patient_id": 1,
  "blood_type": "AB+",
  "antibodies": ["Anti-K", "Anti-D"],
  "transfusion_requirements": ["Washed", "Irradiated"],
  "ocr_text": "Card content...",
  "metadata": {},
  "status": "reviewed",
  "reviewed_date": "2023-06-01T12:00:00Z",
  "reviewed_by": "user123",
  "updated_by": "user123",
  "created_at": "2023-06-01T12:00:00Z",
  "updated_at": "2023-06-01T12:00:00Z"
}
```

## Frontend Integration Guide

### Overview
This section provides comprehensive guidelines for integrating a frontend application with the Patient Information API. The guide covers best practices, implementation patterns, and code examples for building a robust frontend application.

### Getting Started

#### Prerequisites
- Node.js (version 14+)
- Package manager (npm or yarn)
- Modern web browser

#### Project Setup
```bash
# Using Create React App
npx create-react-app patient-info-frontend
# OR using Vite
npm create vite@latest patient-info-frontend -- --template react

# Install recommended dependencies
npm install axios react-query react-router-dom formik yup date-fns
```

### API Client Setup

#### Base Configuration
```javascript
// src/api/client.js
import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Service Layer Implementation

#### Patient Service Example
```javascript
// src/api/patientService.js
import apiClient from './client';

export const patientService = {
  getPatients: async (page = 1, limit = 20) => {
    const response = await apiClient.get('/patients', { params: { page, limit } });
    return response.data;
  },
  
  getPatient: async (id) => {
    const response = await apiClient.get(`/patients/${id}`);
    return response.data;
  },
  
  createPatient: async (patientData) => {
    const response = await apiClient.post('/patients', patientData);
    return response.data;
  },
  
  updatePatient: async (id, patientData) => {
    const response = await apiClient.put(`/patients/${id}`, patientData);
    return response.data;
  },
  
  deletePatient: async (id) => {
    const response = await apiClient.delete(`/patients/${id}`);
    return response.data;
  },
  
  searchPatients: async (query, options = {}) => {
    const response = await apiClient.get('/patients/search', { 
      params: { query, ...options }
    });
    return response.data;
  },
  
  getPatientReports: async (id) => {
    const response = await apiClient.get(`/patients/${id}/reports`);
    return response.data;
  },
  
  getPatientCautionCards: async (id) => {
    const response = await apiClient.get(`/patients/${id}/caution-cards`);
    return response.data;
  }
};
```

### React Query Integration

#### Custom Hooks Example
```javascript
// src/hooks/usePatients.js
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { patientService } from '../api/patientService';

export const usePatients = (page = 1, limit = 20) => {
  return useQuery(
    ['patients', page, limit],
    () => patientService.getPatients(page, limit),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const usePatient = (id) => {
  return useQuery(
    ['patient', id],
    () => patientService.getPatient(id),
    {
      enabled: !!id,
    }
  );
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (newPatient) => patientService.createPatient(newPatient),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
      },
    }
  );
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({id, data}) => patientService.updatePatient(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['patient', variables.id]);
        queryClient.invalidateQueries('patients');
      },
    }
  );
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id) => patientService.deletePatient(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
      },
    }
  );
};
```

### File Upload Integration

#### Upload Service Example
```javascript
// src/api/uploadService.js
import apiClient from './client';

export const uploadService = {
  uploadReport: async (file, type, patientId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (patientId) formData.append('patientId', patientId);
    
    const response = await apiClient.post('/reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  uploadCautionCard: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    
    const response = await apiClient.post('/caution-cards/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
};
```

### Error Handling

#### Error Handler Implementation
```javascript
// src/utils/errorHandler.js
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const extractErrorMessage = (error) => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error.response) {
    const serverMessage = error.response.data?.message || error.response.data?.error;
    return serverMessage || `Error ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    return 'Server did not respond. Please check your connection.';
  } else {
    return error.message || 'An unknown error occurred';
  }
};

export const ErrorDisplay = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="error-message">
      {extractErrorMessage(error)}
    </div>
  );
};
```

### Component Implementation Example

#### Patient List Component
```jsx
// src/components/PatientList.jsx
import React, { useState } from 'react';
import { usePatients } from '../hooks/usePatients';
import { ErrorDisplay } from '../utils/errorHandler';
import { Link } from 'react-router-dom';

const PatientList = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { data, isLoading, error } = usePatients(page, limit);
  
  if (isLoading) return <div>Loading patients...</div>;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <div className="patient-list">
      <h1>Patients</h1>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>DOB</th>
            <th>Blood Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.patients?.map((patient) => (
            <tr key={patient.id}>
              <td>{`${patient.firstName} ${patient.lastName}`}</td>
              <td>{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
              <td>{patient.bloodType}</td>
              <td>
                <Link to={`/patients/${patient.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!data?.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PatientList;
```

### Performance Optimization

#### Debounce Implementation
```javascript
// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage in search component
const SearchPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const { data, isLoading } = useQuery(
    ['searchPatients', debouncedSearchTerm],
    () => patientService.searchPatients(debouncedSearchTerm),
    {
      enabled: debouncedSearchTerm.length > 2,
    }
  );
  
  // Component JSX...
};
```

### Project Structure
```
src/
├── api/
│   ├── client.js
│   ├── patientService.js
│   ├── reportService.js
│   └── cautionCardService.js
├── components/
│   ├── common/
│   │   ├── ErrorDisplay.jsx
│   │   ├── Loading.jsx
│   │   └── Pagination.jsx
│   ├── patients/
│   │   ├── PatientList.jsx
│   │   ├── PatientDetail.jsx
│   │   └── PatientForm.jsx
│   ├── reports/
│   │   ├── ReportList.jsx
│   │   └── ReportUpload.jsx
│   └── caution-cards/
│       ├── CautionCardList.jsx
│       └── CautionCardUpload.jsx
├── hooks/
│   ├── usePatients.js
│   ├── useReports.js
│   ├── useCautionCards.js
│   └── useDebounce.js
├── utils/
│   ├── errorHandler.js
│   ├── formatters.js
│   └── validators.js
├── pages/
│   ├── Dashboard.jsx
│   ├── PatientPage.jsx
│   ├── ReportPage.jsx
│   └── CautionCardPage.jsx
├── App.jsx
└── main.jsx
```

### Development Workflow

1. **Development mode**:
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm start
   ```

2. **Production build**:
   ```bash
   # Build frontend
   cd frontend
   npm run build
   
   # Deploy files to backend static directory
   # Then start backend server only
   cd backend
   npm start
   ```

### Best Practices

1. **State Management**
   - Use React Query for server state management
   - Implement proper caching strategies
   - Handle loading and error states consistently

2. **Performance**
   - Implement pagination for all list views
   - Use debouncing for search inputs
   - Lazy load components when possible
   - Optimize image uploads

3. **Error Handling**
   - Implement consistent error handling across the application
   - Show user-friendly error messages
   - Log errors appropriately

4. **Code Organization**
   - Follow a consistent project structure
   - Separate concerns (API, components, hooks)
   - Use TypeScript for better type safety (optional)

5. **Testing**
   - Implement unit tests for services and hooks
   - Add component tests for UI elements
   - Include integration tests for API interactions

### CORS Configuration

The backend server has CORS enabled for development. In production, both frontend and backend should be served from the same origin.

### Conclusion

This integration guide provides the foundation for building a robust frontend application that communicates effectively with the Patient Information API. Follow these best practices and patterns to create a maintainable, performant, and user-friendly application. 