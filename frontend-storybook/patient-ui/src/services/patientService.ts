import apiClient from './apiClient';
import {
  PatientSearchParams,
  // Assuming AdvancedPatientSearchParams covers the search endpoint params and exists in the types file
  AdvancedPatientSearchParams as SearchPatientsParams,
  CreatePatientRequest,
  UpdatePatientRequest,
  Patient,
} from '../types/patient';
import { PaginatedResponse } from '../types/common'; // Assuming PaginatedResponse exists
import { Report } from '../types/report'; // Assuming Report type exists
import { CautionCard } from '../types/cautionCard'; // Assuming CautionCard type exists

// Define simple response types based on API documentation
interface LinkResponse {
  message: string;
}

interface DeleteResponse {
  message: string;
}

// Define request types for linking based on API documentation
interface LinkReportRequest {
  reportId: number | string; // Use number or string based on actual ID type in backend/types
}

interface LinkCautionCardRequest {
  cardId: number | string; // Use number or string based on actual ID type in backend/types
  updatedBy: string; // As per API doc
}

const BASE_URL = '/patients';

export const patientService = {
  // Get paginated patients
  getPatients: async (params?: PatientSearchParams): Promise<PaginatedResponse<Patient>> => {
    const response = await apiClient.get<PaginatedResponse<Patient>>(BASE_URL, { params });
    return response.data;
  },

  // Search patients
  searchPatients: async (params: SearchPatientsParams): Promise<PaginatedResponse<Patient>> => {
    // Ensure SearchPatientsParams aligns with { query/name, dateOfBirth, bloodType, page, limit }
    const response = await apiClient.get<PaginatedResponse<Patient>>(`${BASE_URL}/search`, {
      params,
    });
    return response.data;
  },

  // Get a single patient by ID
  getPatientById: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Create a new patient
  createPatient: async (newPatient: CreatePatientRequest): Promise<Patient> => {
    // Ensure CreatePatientRequest matches the documented body structure
    const response = await apiClient.post<Patient>(BASE_URL, newPatient);
    return response.data;
  },

  // Update an existing patient
  updatePatient: async (id: string, patient: UpdatePatientRequest): Promise<Patient> => {
    // Ensure UpdatePatientRequest matches the documented body structure
    const response = await apiClient.put<Patient>(`${BASE_URL}/${id}`, patient);
    return response.data;
  },

  // Delete a patient
  deletePatient: async (id: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Get reports for a specific patient
  getPatientReports: async (id: string): Promise<Report[]> => {
    const response = await apiClient.get<Report[]>(`${BASE_URL}/${id}/reports`);
    return response.data;
  },

  // Get caution cards for a specific patient
  getPatientCautionCards: async (id: string): Promise<CautionCard[]> => {
    const response = await apiClient.get<CautionCard[]>(`${BASE_URL}/${id}/caution-cards`);
    return response.data;
  },

  // Link a report to a patient
  linkReportToPatient: async (id: string, data: LinkReportRequest): Promise<LinkResponse> => {
    const response = await apiClient.post<LinkResponse>(`${BASE_URL}/${id}/link-report`, data);
    return response.data;
  },

  // Link a caution card to a patient
  linkCautionCardToPatient: async (
    id: string,
    data: LinkCautionCardRequest
  ): Promise<LinkResponse> => {
    const response = await apiClient.post<LinkResponse>(
      `${BASE_URL}/${id}/link-caution-card`,
      data
    );
    return response.data;
  },
};
