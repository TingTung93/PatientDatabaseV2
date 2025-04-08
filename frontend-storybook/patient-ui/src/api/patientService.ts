import apiClient from './client'; // Use default import
import type { FilterCriteria } from '../components/search/FilterBar';
import { Patient, CreatePatientRequest, UpdatePatientRequest } from '../types/patient'; // Import request types

// Interface for paginated response (adjust based on actual API response structure)
interface PaginatedPatientsResponse {
  // patients: Patient[];
  data: Patient[]; // Example: Assuming data is in a 'data' property
  total: number;
  page: number;
  limit: number;
  hasNextPage?: boolean; // Optional based on API
  // Add other pagination fields as provided by the API
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const buildQueryString = (page: number, limit: number, filters?: FilterCriteria) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (filters) {
    if (filters.searchTerm) {
      params.append('q', filters.searchTerm);
    }
    if (filters.bloodType) {
      params.append('bloodType', filters.bloodType);
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
  }

  return `?${params.toString()}`;
};

export const patientService = {
  /**
   * Fetches a paginated list of patients.
   * GET /patients
   */
  getPatients: async (
    page: number,
    limit: number,
    filters?: FilterCriteria
  ): Promise<PaginatedResponse<Patient>> => {
    const queryString = buildQueryString(page, limit, filters);
    const response = await apiClient.get<PaginatedResponse<Patient>>(`/patients${queryString}`);
    return response.data;
  },

  /**
   * Searches for patients based on query and options.
   * GET /patients/search
   */
  searchPatients: async (
    query: string,
    options: Record<string, unknown> = {}
  ): Promise<PaginatedPatientsResponse> => {
    const response = await apiClient.get<PaginatedPatientsResponse>('/patients/search', {
      params: { query, ...options },
    });
    return response.data;
  },

  /**
   * Fetches a single patient by ID.
   * GET /patients/:id
   */
  getPatient: async (id: string | number): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  /**
   * Creates a new patient record.
   * POST /patients
   */
  createPatient: async (patientData: CreatePatientRequest): Promise<Patient> => {
    // Use CreatePatientRequest
    const response = await apiClient.post<Patient>('/patients', patientData);
    return response.data;
  },

  /**
   * Updates an existing patient record.
   * PUT /patients/:id
   */
  updatePatient: async (
    id: string | number,
    patientData: UpdatePatientRequest
  ): Promise<Patient> => {
    // Use UpdatePatientRequest
    // IMPORTANT: Adjust Partial<Patient> if the API expects the full object for PUT
    // Also consider backend changes needed for Phenotype/Antibody fields
    const response = await apiClient.put<Patient>(`/patients/${id}`, patientData);
    return response.data;
  },

  /**
   * Deletes a patient record by ID.
   * DELETE /patients/:id
   */
  deletePatient: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/patients/${id}`);
  },

  /**
   * Fetches reports associated with a patient.
   * GET /patients/:id/reports
   * Define Report type later
   */
  getPatientReports: async (id: string | number): Promise<any[]> => {
    // Replace 'any' with Report[] type later
    const response = await apiClient.get<any[]>(`/patients/${id}/reports`);
    return response.data;
  },

  /**
   * Fetches caution cards associated with a patient.
   * GET /patients/:id/caution-cards
   * Define CautionCard type later
   */
  getPatientCautionCards: async (id: string | number): Promise<any[]> => {
    // Replace 'any' with CautionCard[] type later
    const response = await apiClient.get<any[]>(`/patients/${id}/caution-cards`);
    return response.data;
  },

  // Add functions for linking reports/cards if needed, based on API docs
  // linkReportToPatient: async (patientId, reportId) => { ... }
  // linkCautionCardToPatient: async (patientId, cardId) => { ... }
};
