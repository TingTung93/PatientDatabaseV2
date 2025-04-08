import { apiClient as axiosInstance } from '../apiClient';
import { 
  Patient, 
  PatientListResponse, 
  CreatePatientRequest, 
  UpdatePatientRequest, 
  PatientSearchParams,
  AdvancedPatientSearchParams,
  BatchOperation,
  BatchOperationResult
} from '../../types/patient';

const API_URL = '/patients';

/**
 * Get all patients with optional filtering
 */
export const getPatients = async (params?: PatientSearchParams): Promise<PatientListResponse> => {
  const response = await axiosInstance.get<PatientListResponse>(API_URL, { params });
  return response.data;
};

/**
 * Get a patient by ID
 */
export const getPatientById = async (id: string): Promise<Patient> => {
  const response = await axiosInstance.get<Patient>(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Create a new patient
 */
export const createPatient = async (patient: CreatePatientRequest): Promise<Patient> => {
  const response = await axiosInstance.post<Patient>(API_URL, patient);
  return response.data;
};

/**
 * Update an existing patient
 */
export const updatePatient = async (id: string, patient: UpdatePatientRequest): Promise<Patient> => {
  const response = await axiosInstance.put<Patient>(`${API_URL}/${id}`, patient);
  return response.data;
};

/**
 * Delete a patient
 */
export const deletePatient = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.delete<{ success: boolean; message: string }>(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Perform advanced search for patients
 */
export const advancedPatientSearch = async (params: AdvancedPatientSearchParams): Promise<PatientListResponse> => {
  const response = await axiosInstance.get<PatientListResponse>(`${API_URL}/advanced-search`, { params });
  return response.data;
};

/**
 * Perform batch operations on patients
 */
export const batchOperations = async (data: BatchOperation): Promise<BatchOperationResult> => {
  const response = await axiosInstance.post<BatchOperationResult>(`${API_URL}/batch`, data);
  return response.data;
}; 