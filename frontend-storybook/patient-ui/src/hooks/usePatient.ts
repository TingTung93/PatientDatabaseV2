import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Patient } from '../types/patient';
import { patientApi } from '../api/endpoints/patientApi';

export const usePatient = (id: string, options: { enabled: boolean }): UseQueryResult<Patient, Error> => {
  return useQuery<Patient, Error>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const response = await patientApi.getPatientById(id);
      return response;
    },
    enabled: options.enabled,
  });
}; 