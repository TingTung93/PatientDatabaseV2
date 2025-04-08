import { apiClient } from '../apiClient';
import { Patient } from '../../types/patient';

const API_BASE = '/api/v1';

export const patientApi = {
  getAllPatients: async () => {
    const response = await apiClient.get<Patient[]>(`${API_BASE}/patients`);
    return response.data;
  },

  getPatientById: async (id: string) => {
    const response = await apiClient.get<Patient>(`${API_BASE}/patients/${id}`);
    return response.data;
  },

  createPatient: async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await apiClient.post<Patient>(`${API_BASE}/patients`, patient);
    return response.data;
  },

  updatePatient: async (id: string, patient: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const response = await apiClient.put<Patient>(`${API_BASE}/patients/${id}`, patient);
    return response.data;
  },

  deletePatient: async (id: string) => {
    await apiClient.delete(`${API_BASE}/patients/${id}`);
  },
}; 