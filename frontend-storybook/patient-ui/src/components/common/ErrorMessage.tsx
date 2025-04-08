import React from 'react';
import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  title?: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = 'Error',
  severity = 'error',
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Alert severity={severity}>
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  );
};
