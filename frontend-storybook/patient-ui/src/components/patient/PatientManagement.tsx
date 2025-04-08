import React, { useState } from 'react';
import { Patient } from '../../types/patient';
import { PatientForm } from './PatientForm';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Button } from '../common/Button'; // Assuming Button component exists

interface PatientManagementProps {
  patient?: Patient;
  isLoading?: boolean;
  // onCreate expects data including 'id' but excluding identification and audit fields
  onCreate?: (
    patientData: Omit<
      Patient,
      'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ) => Promise<{
    // Omit id
    success: boolean;
    message: string;
    patient: Patient;
  }>;
  onUpdate?: (
    patientId: string,
    patientData: Partial<Patient>
  ) => Promise<{
    success: boolean;
    message: string;
    patient: Patient;
  }>;
  onDelete?: (patientId: string) => Promise<{
    success: boolean;
    message: string;
  }>;
}

interface PatientViewProps {
  patient: Patient;
  onUpdate?: PatientManagementProps['onUpdate'];
  onDelete?: PatientManagementProps['onDelete'];
}

const PatientView: React.FC<PatientViewProps> = ({ patient, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Match the type expected by PatientForm's onSubmit prop
  const handleUpdate = async (
    values: Omit<
      Patient,
      'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ) => {
    if (!onUpdate) return;
    // Use patient.id (root ID) for the update call
    await onUpdate(patient.id, values);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this patient?')) return;
    setIsDeleting(true);
    try {
      // Use patient.id (root ID) for the delete call
      await onDelete(patient.id);
      // No need to setIsDeleting(false) if component unmounts on success
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false); // Reset on error
    }
  };

  if (isEditing) {
    return (
      <div className="patient-edit p-4 border rounded shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Patient</h3>
          <Button onClick={() => setIsEditing(false)} variant="secondary">
            Cancel
          </Button>
        </div>
        {/* Pass patient data for editing, handleUpdate expects the form values */}
        <PatientForm
          patient={patient}
          onSubmit={handleUpdate}
          // Pass isSubmitting state if onUpdate returns loading state
        />
      </div>
    );
  }

  // Display Patient Data (Example Structure)
  return (
    <div className="patient-view p-4 border rounded shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          {patient.demographics.firstName} {patient.demographics.lastName} (ID: {patient.id})
        </h3>
        <div className="space-x-2">
          {onUpdate && (
            <Button onClick={() => setIsEditing(true)} variant="primary">
              Edit
            </Button>
          )}
          {onDelete && (
            <Button onClick={handleDelete} variant="danger" disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
      {/* Display other patient details here */}
      <p>MRN: {patient.identification.mrn}</p>
      <p>DOB: {patient.demographics.dateOfBirth}</p>
      {/* ... etc ... */}
    </div>
  );
};

export const PatientManagement: React.FC<PatientManagementProps> = ({
  patient,
  isLoading = false,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [isCreating, setIsCreating] = useState(false);

  // Match the type expected by the onCreate prop
  const handleCreate = async (
    values: Omit<
      Patient,
      'id' | 'identification' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ) => {
    // Omit id as expected by PatientForm
    if (!onCreate) return;
    try {
      await onCreate(values); // Pass values directly
      setIsCreating(false);
    } catch (error) {
      // Error should be handled within PatientForm via Formik status
      console.error('Create failed:', error);
      // Optionally re-throw or display a generic error here if needed
      throw error;
    }
  };

  return (
    <ErrorBoundary>
      <div className="patient-management p-4">
        <h2 className="text-2xl font-bold mb-4">Patient Management</h2>

        {isLoading ? (
          <LoadingSpinner size="large" message="Loading patient data..." />
        ) : (
          <div className="patient-content">
            {patient ? (
              // Conditionally spread onUpdate and onDelete to PatientView
              <PatientView
                patient={patient}
                {...(onUpdate && { onUpdate })}
                {...(onDelete && { onDelete })}
              />
            ) : (
              <div className="create-patient">
                {isCreating ? (
                  <div className="p-4 border rounded shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">Create New Patient</h3>
                      <Button onClick={() => setIsCreating(false)} variant="secondary">
                        Cancel
                      </Button>
                    </div>
                    <PatientForm onSubmit={handleCreate} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No patient selected.</p>
                    {onCreate && (
                      <Button onClick={() => setIsCreating(true)} variant="primary">
                        Create New Patient
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PatientManagement;
