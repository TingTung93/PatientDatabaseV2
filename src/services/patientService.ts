import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  contactNumber: string;
  email: string;
  address: string;
  medicalRecordNumber: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface PatientSearchParams {
  query?: string;
  name?: string;
  dateOfBirth?: string;
  bloodType?: string;
  page?: number;
  limit?: number;
}

export interface BatchOperation {
  operation: 'create' | 'update' | 'delete';
  id?: number;
  patient?: Partial<Patient>;
}

export interface BatchResponse {
  success: boolean;
  results: Array<{
    operation: string;
    success: boolean;
    data?: Patient;
    id?: number;
  }>;
}

class PatientService {
  async getAllPatients(params: PatientSearchParams = {}): Promise<PaginatedResponse<Patient>> {
    const response = await axios.get(`${BASE_URL}/patients`, { params });
    return response.data;
  }

  async searchPatients(query: string, params: Omit<PatientSearchParams, 'query'> = {}): Promise<PaginatedResponse<Patient>> {
    const response = await axios.get(`${BASE_URL}/patients/search`, { 
      params: { query, ...params }
    });
    return response.data;
  }

  async getPatientById(id: number): Promise<Patient> {
    const response = await axios.get(`${BASE_URL}/patients/${id}`);
    return response.data;
  }

  async createPatient(patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const response = await axios.post(`${BASE_URL}/patients`, patientData);
    return response.data;
  }

  async updatePatient(id: number, patientData: Partial<Patient>): Promise<Patient> {
    const response = await axios.put(`${BASE_URL}/patients/${id}`, patientData);
    return response.data;
  }

  async deletePatient(id: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${BASE_URL}/patients/${id}`);
    return response.data;
  }

  async batchOperations(operations: BatchOperation[]): Promise<BatchResponse> {
    const response = await axios.post(`${BASE_URL}/patients/batch`, { operations });
    return response.data;
  }

  async getPatientReports(id: number): Promise<PaginatedResponse<any>> {
    const response = await axios.get(`${BASE_URL}/patients/${id}/reports`);
    return response.data;
  }

  async getPatientCautionCards(id: number): Promise<PaginatedResponse<any>> {
    const response = await axios.get(`${BASE_URL}/patients/${id}/caution-cards`);
    return response.data;
  }

  async linkReport(patientId: number, reportId: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${BASE_URL}/patients/${patientId}/link-report`, { reportId });
    return response.data;
  }

  async linkCautionCard(patientId: number, cardId: number, updatedBy: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${BASE_URL}/patients/${patientId}/link-caution-card`, { cardId, updatedBy });
    return response.data;
  }
}

export const patientService = new PatientService(); 