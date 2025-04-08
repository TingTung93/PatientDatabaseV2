/**
 * ActiveTasksList.jsx
 * 
 * Component to display a list of active OCR processing tasks
 * Shows real-time updates for all ongoing OCR tasks
 */

import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  LinearProgress, 
  Paper, 
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { useOcrProgress } from '../hooks/useOcrProgress';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

/**
 * Component to display a list of all active OCR tasks
 * 
 * @param {Object} props
 * @param {function} props.onSelectTask - Callback when a task is selected
 */
const ActiveTasksList = ({ onSelectTask }) => {
  const { activeTasks, connected } = useOcrProgress();
  
  // Convert tasks object to sorted array
  const tasksList = React.useMemo(() => {
    return Object.entries(activeTasks)
      .map(([taskId, task]) => ({
        id: taskId,
        ...task
      }))
      .sort((a, b) => {
        // Sort by status (processing first, then completed, then error)
        if (a.status !== b.status) {
          if (a.status === 'processing') return -1;
          if (b.status === 'processing') return 1;
          if (a.status === 'completed') return -1;
          if (b.status === 'completed') return 1;
        }
        // Then sort by timestamp (newest first)
        return b.timestamp - a.timestamp;
      });
  }, [activeTasks]);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlineIcon color="success" />;
      case 'error':
        return <ErrorOutlineIcon color="error" />;
      case 'processing':
      case 'initialized':
        return <AccessTimeIcon color="primary" />;
      default:
        return <AccessTimeIcon color="disabled" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Format time elapsed
  const formatTimeElapsed = (timestamp) => {
    if (!timestamp) return '';
    
    const elapsed = Date.now() - timestamp;
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Active OCR Tasks</Typography>
        <Chip 
          label={connected ? 'Connected' : 'Disconnected'} 
          color={connected ? 'success' : 'error'} 
          size="small" 
          variant="outlined"
        />
      </Box>
      
      {tasksList.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          No active OCR tasks
        </Typography>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {tasksList.map((task, index) => (
            <React.Fragment key={task.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <Tooltip title="View details">
                    <IconButton edge="end" aria-label="view" onClick={() => onSelectTask(task.id)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  {getStatusIcon(task.status)}
                </Box>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" component="span">
                        {task.filename || `Task ${task.id.substring(0, 8)}`}
                      </Typography>
                      <Chip 
                        label={task.status} 
                        color={getStatusColor(task.status)} 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {task.message || 'Processing...'}
                      </Typography>
                      {task.status === 'processing' && (
                        <LinearProgress 
                          variant="determinate" 
                          value={task.progress || 0} 
                          sx={{ mt: 1, height: 5, borderRadius: 5 }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                        {formatTimeElapsed(task.timestamp)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ActiveTasksList;
