import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { usePatient, useDeletePatient } from '../hooks/usePatients';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import ReportUploadModal from '../components/reports/ReportUploadModal';
import { PatientReportsList } from '../components/patients/PatientReportsList';
import { PatientCautionCardList } from '../components/patients/PatientCautionCardList';
import { FallbackError } from '../components/common/FallbackError';
import { withErrorBoundary } from '../components/common/withErrorBoundary';
import { Patient } from '../types/patient';
import { formatDate } from '../utils/dateUtils';

// Simple component to display label/value pairs
const DataField: React.FC<{ label: string; value?: string | number | null }> = ({
  label,
  value,
}) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {label}
    </Typography>
    <Typography variant="body1">{value ?? 'N/A'}</Typography>
  </Box>
);

const PatientDetailPageContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Return early if no ID is provided
  if (!id) {
    return (
      <FallbackError
        error={new Error('No patient ID provided.')}
        resetErrorBoundary={() => navigate('/patients')}
      />
    );
  }

  const { data: patient, isLoading, error, refetch } = usePatient(id);
  const deletePatientMutation = useDeletePatient();

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    deletePatientMutation.mutate(id, {
      onSuccess: () => {
        console.log('Patient deleted successfully');
        navigate('/patients');
        setIsDeleteModalOpen(false);
      },
      onError: err => {
        console.error(`Failed to delete patient: ${err.message}`);
        setIsDeleteModalOpen(false);
      },
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !patient) {
    return (
      <FallbackError error={error || new Error('Patient not found')} resetErrorBoundary={refetch} />
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {patient.demographics.firstName} {patient.demographics.lastName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={Link}
            to={`/patients/${id}/edit`}
            variant="outlined"
            startIcon={<EditIcon />}
          >
            Edit Patient
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            disabled={deletePatientMutation.isPending}
          >
            {deletePatientMutation.isPending ? 'Deleting...' : 'Delete Patient'}
          </Button>
        </Box>
      </Box>

      {/* Patient Information Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Patient Information
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexBasis: { xs: '100%', md: 'calc(50% - 8px)' }, flexGrow: 1 }}>
              <DataField label="First Name" value={patient.demographics.firstName} />
              <DataField label="Last Name" value={patient.demographics.lastName} />
              <DataField label="MRN" value={patient.identification.mrn} />
              <DataField
                label="Blood Type"
                value={`${patient.bloodProfile.abo}${patient.bloodProfile.rh}`}
              />
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', md: 'calc(50% - 8px)' }, flexGrow: 1 }}>
              <DataField
                label="Date of Birth"
                value={formatDate(patient.demographics.dateOfBirth)}
              />
              <DataField label="Gender" value={patient.demographics.gender} />
              <DataField label="Contact" value={patient.demographics.contactNumber} />
              <DataField label="Email" value={patient.demographics.email} />
            </Box>
            {patient.notes && patient.notes.length > 0 && (
              <Box sx={{ width: '100%' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Notes
                </Typography>
                {patient.notes.map((note, index) => (
                  <Typography key={index} variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                    {note.content}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Caution Cards Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Caution Cards
        </Typography>
        <PatientCautionCardList patientId={id} />
      </Box>

      {/* Reports Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Reports</Typography>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Report
          </Button>
        </Box>
        <PatientReportsList patientId={id} />
      </Box>

      {/* Modals */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Patient"
        message={`Are you sure you want to delete ${patient.demographics.firstName} ${patient.demographics.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        isConfirming={deletePatientMutation.isPending}
      />

      <ReportUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
        }}
        initialPatientId={id}
      />
    </Box>
  );
};

export const PatientDetailPage = withErrorBoundary(PatientDetailPageContent);
