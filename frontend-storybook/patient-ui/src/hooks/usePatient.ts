import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Patient } from '../types/patient';
import { patientApi } from '../api/endpoints/patientApi';

interface UsePatientOptions {
  enabled?: boolean;
}

export const usePatient = (
  id: string,
  options: UsePatientOptions = {}
): UseQueryResult<Patient, Error> => {
  return useQuery<Patient, Error>({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Patient ID is required');
      }
      const response = await patientApi.getPatientById(id);
      return response;
    },
    enabled: options.enabled !== false && Boolean(id),
  });
}; 