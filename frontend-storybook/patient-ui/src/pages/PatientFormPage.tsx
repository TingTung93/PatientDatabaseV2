import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as Yup from 'yup';
import { Patient, PatientIdentification, CreatePatientRequest, UpdatePatientRequest } from '../types/patient';
import { PatientForm } from '../components/patient/PatientForm';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FallbackError } from '../components/common/FallbackError';
import { usePatient } from '../hooks/usePatient';
import { useCreatePatient, useUpdatePatient } from '../hooks/usePatientMutations';

// Add validation schema with proper typing
const validationSchema = Yup.object().shape({
  identification: Yup.object().shape({
    mrn: Yup.string().required('MRN is required'),
  }),
  demographics: Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
  }),
  bloodProfile: Yup.object().shape({
    abo: Yup.string()
      .oneOf(['A', 'B', 'AB', 'O'], 'Invalid blood type')
      .required('Blood type is required'),
    rh: Yup.string().oneOf(['+', '-'], 'Invalid Rh factor').required('Rh factor is required'),
  }),
  notes: Yup.string(),
});

// Type for the values coming from PatientForm
// This should match the structure used in PatientForm's Formik initialValues
type PatientFormValues = Omit<
  Patient,
  'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>;

export const PatientFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query for existing patient if editing
  const { data: existingPatient, isLoading, error } = usePatient(id || '', {
    enabled: !!id,
  });

  // Mutations for create/update
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  const handleSubmit = async (values: PatientFormValues): Promise<void> => {
    try {
      // Construct identification from form values or existing patient
      // Assuming MRN is the primary identifier edited in the form for now
      const identificationData: PatientIdentification = existingPatient?.identification || {
        id: '', // ID is set by backend or comes from existingPatient
        mrn: values.medicalRecordNumber || '', // Get MRN from form if available
      };

      // Prepare the core patient data structure expected by the API
      const corePatientData = {
        demographics: values.demographics,
        bloodProfile: values.bloodProfile,
        medicalHistory: values.medicalHistory,
        comments: values.comments ?? [], // Ensure array
        notes: values.notes ?? [], // Ensure array
        cautionFlags: values.cautionFlags ?? [], // Ensure array or undefined (use [])
        specialProcedures: values.specialProcedures ?? [], // Ensure array or undefined (use [])
      };

      if (id) {
        // Prepare UpdatePatientRequest
        const updateData: UpdatePatientRequest = {
          identification: identificationData, // Use the constructed identification
          ...corePatientData,
        };
        await updateMutation.mutateAsync({ id, patientData: updateData });
      } else {
        // Prepare CreatePatientRequest
        const createData: CreatePatientRequest = {
          identification: identificationData, // Use the constructed identification
          ...corePatientData,
        };
        await createMutation.mutateAsync(createData);
      }

      // Invalidate queries to refetch patient list
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // Navigate back to patient list
      navigate('/patients');
    } catch (error) {
      console.error('Failed to save patient:', error);
      // Error handling is managed by the mutation hooks
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <FallbackError error={error} resetErrorBoundary={() => window.location.reload()} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900">
          {id ? 'Edit Patient' : 'New Patient'}
        </h1>
      </div>

      <div className="mt-5">
        <PatientForm
          // Conditionally include the patient prop only when editing
          {...(id && existingPatient ? { patient: existingPatient } : {})}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
};
