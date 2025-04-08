import { apiClient } from './apiClient';
import type { Patient } from '../types/patient';

interface SearchPatientsParams {
  query: string;
  limit?: number;
}

/**
 * Searches for patients based on a query string.
 * @param params - The search parameters including query and optional limit.
 * @returns A promise resolving to an array of patients.
 */
export const searchPatients = async ({ query, limit = 10 }: SearchPatientsParams): Promise<Patient[]> => {
  const response = await apiClient.get<Patient[]>('/patients/search', {
    params: { query, limit },
  });
  return response.data;
}; 