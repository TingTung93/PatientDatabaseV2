import { apiClient } from '../apiClient';
import {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../../types/patient';

const API_BASE = '/api/v1';

export const patientApi = {
  getAllPatients: async (): Promise<Patient[]> => {
    const response = await apiClient.get<Patient[]>(`${API_BASE}/patients`);
    return response.data;
  },

  getPatientById: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`${API_BASE}/patients/${id}`);
    return response.data;
  },

  createPatient: async (patientData: CreatePatientRequest): Promise<Patient> => {
    const response = await apiClient.post<Patient>(`${API_BASE}/patients`, patientData);
    return response.data;
  },

  updatePatient: async (
    id: string,
    patientData: UpdatePatientRequest
  ): Promise<Patient> => {
    const response = await apiClient.put<Patient>(
      `${API_BASE}/patients/${id}`,
      patientData
    );
    return response.data;
  },

  deletePatient: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/patients/${id}`);
  },
}; 