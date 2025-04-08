import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { usePatient } from '../../hooks/usePatients'; // Correct path

interface LinkCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (patientId: string) => void;
  isLoading: boolean;
}

export const LinkCardModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: LinkCardModalProps): JSX.Element => {
  const [patientId, setPatientId] = useState('');
  const [error, setError] = useState('');

  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId); // Remove second argument

  const handlePatientIdChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setPatientId(value);
    setError('');
  };

  const handleConfirm = (): void => {
    if (!patientId) {
      setError('Patient ID is required');
      return;
    }

    if (!patient) {
      setError('Patient not found');
      return;
    }

    onConfirm(patientId);
  };

  const handleClose = (): void => {
    setPatientId('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Link Card to Patient</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Patient ID"
            value={patientId}
            onChange={handlePatientIdChange}
            error={!!error}
            helperText={error}
            disabled={isLoading}
            autoFocus
          />
          {isLoadingPatient && patientId && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner size="small" /> {/* Use string size */}
            </Box>
          )}
          {patient && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="primary">
                Patient found: {patient.demographics.firstName} {patient.demographics.lastName}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary" disabled={isLoading || !patient}>
          {isLoading ? <LoadingSpinner size="small" /> : 'Link'} {/* Use string size */}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
