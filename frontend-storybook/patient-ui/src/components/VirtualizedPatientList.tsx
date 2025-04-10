import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Patient } from '../types/patient';

interface VirtualizedPatientListProps {
  patients: Patient[];
  onDelete: (id: string | number) => void;
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
          key={patient.identification.id}
          secondaryAction={
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={() => onDelete(patient.identification.id)}
              disabled={isDeleting && deletingId === patient.identification.id}
            >
              {isDeleting && deletingId === patient.identification.id ? (
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
