import { useMutation, UseMutationResult } from '@tanstack/react-query';
import {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patient';
import { patientApi } from '../api/endpoints/patientApi';

// Input for the create mutation hook
type CreatePatientHookInput = CreatePatientRequest;

// Input for the update mutation hook
type UpdatePatientHookInput = {
  id: string;
  patientData: UpdatePatientRequest;
};

export const useCreatePatient = (): UseMutationResult<
  Patient,
  Error,
  CreatePatientHookInput
> => {
  return useMutation({
    mutationFn: async (patientData: CreatePatientHookInput) => {
      // Directly pass the CreatePatientRequest object to the API
      const response = await patientApi.createPatient(patientData);
      return response;
    },
  });
};

export const useUpdatePatient = (): UseMutationResult<
  Patient,
  Error,
  UpdatePatientHookInput
> => {
  return useMutation({
    mutationFn: async ({ id, patientData }: UpdatePatientHookInput) => {
      // Pass the ID and UpdatePatientRequest object to the API
      const response = await patientApi.updatePatient(id, patientData);
      return response;
    },
  });
}; 