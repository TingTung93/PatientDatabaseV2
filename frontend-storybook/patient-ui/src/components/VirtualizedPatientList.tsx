import React from 'react';
import { List, ListItem, ListItemText, IconButton, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; // Correct import path
import { Patient } from '../types/patient';

export interface VirtualizedPatientListProps {
  patients: Patient[];
  onDelete: (patientId: string | number) => void;
  isDeleting: boolean;
  deletingId?: string | number;
}

export const VirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
  patients,
  onDelete,
  isDeleting,
  deletingId,
}) => {
  return (
    <List>
      {patients.map(patient => (
        <ListItem
          key={patient.id}
          secondaryAction={
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={() => onDelete(patient.id)}
              disabled={isDeleting && deletingId === patient.id}
            >
              {isDeleting && deletingId === patient.id ? (
                <CircularProgress size={24} />
              ) : (
                <DeleteIcon />
              )}
            </IconButton>
          }
        >
          <ListItemText
            primary={`${patient.demographics.firstName} ${patient.demographics.lastName}`}
            secondary={`MRN: ${patient.identification.mrn}`}
          />
        </ListItem>
      ))}
    </List>
  );
};
