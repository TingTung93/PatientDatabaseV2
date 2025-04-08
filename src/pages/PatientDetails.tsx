import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { patientService } from '../services/patientService';
import { ReportManagement } from '../components/patient/ReportManagement';
import { CautionCardList } from '../components/caution-cards/CautionCardList';
import { CautionCardUpload } from '../components/caution-cards/CautionCardUpload';

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: patient, isLoading, error } = useQuery(
    ['patient', id],
    () => patientService.getPatientById(id!),
    {
      enabled: !!id,
    }
  );

  const deleteMutation = useMutation(
    () => patientService.deletePatient(id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patients');
        navigate('/patients');
      },
    }
  );

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <div>Loading patient details...</div>;
  if (error) return <div>Error loading patient: {(error as Error).message}</div>;
  if (!patient) return <div>Patient not found</div>;

  return (
    <div className="patient-details">
      <div className="page-header">
        <h1>{patient.firstName} {patient.lastName}</h1>
        <div className="header-actions">
          <Link to={`/patients/${id}/edit`} className="edit-button">
            Edit Patient
          </Link>
          <button onClick={handleDelete} className="delete-button">
            Delete Patient
          </button>
        </div>
      </div>

      <div className="patient-info-section">
        <h2>Patient Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Medical Record Number:</label>
            <span>{patient.medicalRecordNumber}</span>
          </div>
          <div className="info-item">
            <label>Date of Birth:</label>
            <span>{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <label>Gender:</label>
            <span>{patient.gender}</span>
          </div>
          <div className="info-item">
            <label>Blood Type:</label>
            <span>{patient.bloodType}</span>
          </div>
          <div className="info-item">
            <label>Contact Number:</label>
            <span>{patient.contactNumber}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{patient.email}</span>
          </div>
          <div className="info-item">
            <label>Address:</label>
            <span>{patient.address}</span>
          </div>
        </div>
      </div>

      <div className="caution-cards-section">
        <h2>Caution Cards</h2>
        <CautionCardUpload patientId={id} />
        <CautionCardList patientId={id} />
      </div>

      <div className="reports-section">
        <h2>Medical Reports</h2>
        <ReportManagement patientId={id} />
      </div>
    </div>
  );
}; 