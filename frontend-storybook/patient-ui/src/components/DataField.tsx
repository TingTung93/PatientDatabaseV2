import React from 'react';
import { Box, Typography } from '@mui/material';

interface DataFieldProps {
  label: string;
  value: string | undefined;
}

export const DataField: React.FC<DataFieldProps> = ({ label, value }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  );
};
