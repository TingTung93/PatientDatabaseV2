import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Typography, Paper, Container, Box, List, ListItem, ListItemText, IconButton, LinearProgress, Autocomplete, TextField, CircularProgress, InputAdornment } from '@mui/material';
import { Delete as DeleteIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon, Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { FileUploadUI } from '../components/common/FileUploadUI';
import { fileValidationService, FileTypeCategory } from '../services/FileValidationService';
import { fileUploadService, UploadProgress } from '../services/FileUploadService';
import { usePatientSearch } from '../hooks/usePatientSearch';
import { Patient } from '../types/patient';

interface UploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  retryCount?: number;
  preview: string | undefined;
}

interface PatientOption {
  id: string;
  label: string; // Display name
  patient: Patient;
}

export const CautionCardUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [patientId, setPatientId] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Patient search hook
  const { data: patients, isLoading: isSearching } = usePatientSearch(patientSearchQuery, {
    enabled: patientSearchQuery.length >= 2,
  });

  // Transform patients into autocomplete options
  const patientOptions: PatientOption[] = React.useMemo((): PatientOption[] => {
    return patients?.map(patient => ({
      id: patient.id,
      label: `${patient.lastName}, ${patient.firstName} (${patient.medicalRecordNumber || 'No MRN'})`,
      patient,
    })) || [];
  }, [patients]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      // Revoke the data urls to avoid memory leaks
      uploadItems.forEach(item => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [uploadItems]);

  const handleFileSelect = useCallback((file: File): void => {
    setUploadItems(prev => {
      // Check if file is already in the list
      if (prev.some(item => item.file.name === file.name)) {
        return prev;
      }

      // Create preview URL for image files
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      const newItem: UploadItem = {
        file,
        progress: 0,
        status: 'pending',
        preview
      };

      return [...prev, newItem];
    });
    setGlobalError(null);
  }, []);

  const handleFileValidationError = useCallback((errorMsg: string): void => {
    setGlobalError(errorMsg);
  }, []);

  const handleRemoveFile = (fileName: string): void => {
    setUploadItems(prev => {
      const item = prev.find(item => item.file.name === fileName);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(item => item.file.name !== fileName);
    });
  };

  const validateCautionCardFile = useCallback((file: File): { message: string } | null => {
    const result = fileValidationService.validateFile(file, FileTypeCategory.CautionCard);
    if (typeof result === 'string') {
      return { message: result };
    }
    return null;
  }, []);

  const handleRetry = async (fileName: string): Promise<void> => {
    const item = uploadItems.find(item => item.file.name === fileName);
    if (!item) return;

    // Reset item status
    updateItemProgress(fileName, 0, 'uploading');

    try {
      const result = await fileUploadService.uploadFile(
        item.file,
        FileTypeCategory.CautionCard,
        patientId,
        (progress: UploadProgress) => {
          updateItemProgress(fileName, progress.percent, 'uploading');
        }
      );

      if (result.success) {
        updateItemProgress(fileName, 100, 'success');
        // Invalidate queries if this was the last failed item
        const remainingFailures = uploadItems.filter(
          i => i.file.name !== fileName && i.status === 'error'
        ).length;
        if (remainingFailures === 0) {
          queryClient.invalidateQueries({ queryKey: ['caution-cards'] });
          if (patientId) {
            queryClient.invalidateQueries({ queryKey: ['patient-caution-cards', patientId] });
          }
        }
      } else {
        updateItemProgress(
          fileName,
          0,
          'error',
          result.message || 'Upload failed',
          (item.retryCount || 0) + 1
        );
      }
    } catch (error) {
      updateItemProgress(
        fileName,
        0,
        'error',
        error instanceof Error ? error.message : 'Upload failed',
        (item.retryCount || 0) + 1
      );
    }
  };

  const updateItemProgress = (
    fileName: string,
    progress: number,
    status: UploadItem['status'],
    error?: string,
    retryCount?: number
  ): void => {
    setUploadItems(prev =>
      prev.map(item =>
        item.file.name === fileName
          ? {
              ...item,
              progress,
              status,
              ...(error && { error }),
              ...(retryCount !== undefined && { retryCount })
            }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (uploadItems.length === 0) {
      setGlobalError('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setGlobalError(null);

    try {
      // Upload files in parallel with Promise.all
      await Promise.all(uploadItems.map(async (item) => {
        if (item.status === 'success') return; // Skip already uploaded files

        updateItemProgress(item.file.name, 0, 'uploading');

        try {
          const result = await fileUploadService.uploadFile(
            item.file,
            FileTypeCategory.CautionCard,
            patientId,
            (progress: UploadProgress) => {
              updateItemProgress(item.file.name, progress.percent, 'uploading');
            }
          );

          if (result.success) {
            updateItemProgress(item.file.name, 100, 'success');
          } else {
            updateItemProgress(item.file.name, 0, 'error', result.message || 'Upload failed');
          }
        } catch (error) {
          updateItemProgress(
            item.file.name,
            0,
            'error',
            error instanceof Error ? error.message : 'Upload failed'
          );
        }
      }));

      // Invalidate queries after all uploads complete
      queryClient.invalidateQueries({ queryKey: ['caution-cards'] });
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-caution-cards', patientId] });
      }

      // Check if all uploads were successful
      const allSuccess = uploadItems.every(item => item.status === 'success');
      if (allSuccess) {
        navigate('/caution-cards');
      }
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: UploadItem['status']): string => {
    switch (status) {
      case 'success': return 'success.main';
      case 'error': return 'error.main';
      case 'uploading': return 'primary.main';
      default: return 'text.secondary';
    }
  };

  const handlePatientChange = (event: React.SyntheticEvent, value: PatientOption | null): void => {
    setSelectedPatient(value);
    setPatientId(value?.id || '');
  };

  const handlePatientInputChange = (event: React.SyntheticEvent, value: string): void => {
    setPatientSearchQuery(value);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient({
      id: patient.identification.id,
      label: `${patient.demographics.firstName} ${patient.demographics.lastName}`,
      patient
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="div" gutterBottom>
          Upload Caution Cards
        </Typography>

        <Paper sx={{ p: 3, mt: 2 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <FileUploadUI
                label="Caution Card Files"
                onFileSelect={handleFileSelect}
                onValidationError={handleFileValidationError}
                validateFile={validateCautionCardFile}
                accept={fileValidationService.getAcceptString(FileTypeCategory.CautionCard)}
                selectedFile={null}
                disabled={isUploading}
                instructions={`Drag & drop image files here (Max ${fileValidationService.getMaxFileSizeMB()}MB each), or click to select. Supports multiple files.`}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Link to Patient (Optional)
              </Typography>
              <Autocomplete
                value={selectedPatient}
                onChange={handlePatientChange}
                onInputChange={handlePatientInputChange}
                options={patientOptions}
                loading={isSearching}
                disabled={isUploading}
                renderInput={(params) => (
                  <TextField
                    inputRef={params.InputProps.ref}
                    inputProps={params.inputProps}
                    placeholder="Search by name or MRN"
                    variant="outlined"
                    fullWidth
                    size="medium"
                    label="Patient Search"
                    InputProps={{
                      className: 'patient-search-input',
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <>
                          {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    disabled={params.disabled || isUploading}
                    id={params.id}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      {option.patient.dateOfBirth && (
                        <Typography variant="caption" color="text.secondary">
                          DOB: {new Date(option.patient.dateOfBirth).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
            </Box>

            {uploadItems.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Files
                </Typography>
                <List>
                  {uploadItems.map((item) => (
                    <ListItem
                      key={item.file.name}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        '.MuiListItemText-root': {
                          flex: '1 1 auto',
                          width: '100%'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', width: '100%', mb: item.preview ? 1 : 0 }}>
                        <ListItemText
                          primary={item.file.name}
                          secondaryTypographyProps={{ component: 'div' }}
                          secondary={
                            <Box sx={{ width: '100%' }}>
                              {item.status === 'uploading' && (
                                <LinearProgress
                                  variant="determinate"
                                  value={item.progress}
                                  sx={{ mt: 1 }}
                                />
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                {item.status === 'success' && <CheckCircleIcon color="success" />}
                                {item.status === 'error' && <ErrorIcon color="error" />}
                                <Typography
                                  variant="body2"
                                  sx={{ color: getStatusColor(item.status) }}
                                >
                                  {item.status === 'uploading'
                                    ? `Uploading: ${item.progress}%`
                                    : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  {item.retryCount ? ` (Attempt ${item.retryCount + 1})` : ''}
                                </Typography>
                                {item.error && (
                                  <Typography variant="body2" color="error">
                                    - {item.error}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                        />
                        {item.status !== 'uploading' && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', ml: 2 }}>
                            {item.status === 'error' && (
                              <IconButton
                                edge="end"
                                aria-label="retry"
                                onClick={() => handleRetry(item.file.name)}
                                disabled={isUploading}
                                sx={{ mr: 1 }}
                              >
                                <RefreshIcon />
                              </IconButton>
                            )}
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleRemoveFile(item.file.name)}
                              disabled={isUploading}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                      {item.preview && (
                        <Box
                          sx={{
                            width: '100%',
                            maxHeight: 200,
                            overflow: 'hidden',
                            borderRadius: 1,
                            mb: 1
                          }}
                        >
                          <img
                            src={item.preview}
                            alt={`Preview of ${item.file.name}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </Box>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {globalError && (
              <Box sx={{ mb: 3 }}>
                <Typography color="error">{globalError}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => navigate('/caution-cards')}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={uploadItems.length === 0 || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload All'}
              </button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CautionCardUploadPage; 