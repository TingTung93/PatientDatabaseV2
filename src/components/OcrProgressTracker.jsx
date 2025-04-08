import React from 'react';
import { Box, Typography, LinearProgress, Paper, Chip, Alert } from '@mui/material';
import { useOcrProgress } from '../hooks/useOcrProgress';

/**
 * Component to display OCR processing progress
 * 
 * @param {Object} props
 * @param {string} props.taskId - OCR task ID to track
 * @param {string} props.title - Title to display
 * @param {function} props.onComplete - Callback when processing completes
 */
const OcrProgressTracker = ({ taskId, title = 'OCR Processing', onComplete }) => {
  const { 
    connected, 
    progress, 
    status, 
    message, 
    result, 
    error,
    reconnectAttempts
  } = useOcrProgress(taskId);

  // Call onComplete callback when processing is complete
  React.useEffect(() => {
    if (status === 'completed' && result && onComplete) {
      onComplete(result);
    }
  }, [status, result, onComplete]);

  // Determine status color
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'info';
    }
  };

  // Format status for display
  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'processing':
        return 'Processing';
      case 'initialized':
        return 'Initialized';
      default:
        return 'Waiting';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={getStatusText()} 
            color={getStatusColor()} 
            size="small" 
            variant={status === 'completed' ? 'filled' : 'outlined'}
          />
        </Box>

        {!connected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {reconnectAttempts > 0 
              ? `Connection lost. Reconnecting (attempt ${reconnectAttempts})...` 
              : 'Connecting to server...'}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message || 'An error occurred during processing'}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={getStatusColor()}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {message || 'Waiting for updates...'}
        </Typography>

        {status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Processing completed successfully!
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default OcrProgressTracker;
