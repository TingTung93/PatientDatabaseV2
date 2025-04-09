import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Typography, Paper, Container, Box } from '@mui/material';
import { FileUploadUI } from '../components/common/FileUploadUI';
import { fileValidationService, FileTypeCategory } from '../services/FileValidationService';
import { fileUploadService, UploadProgress } from '../services/FileUploadService';

export const ReportUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadError(null);
  }, []);

  const handleFileValidationError = useCallback((errorMsg: string) => {
    setSelectedFile(null);
    setUploadError(errorMsg);
  }, []);

  const handleFileReset = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
  }, []);

  const validateReportFile = useCallback((file: File) => {
    return fileValidationService.validateFile(file, FileTypeCategory.Report);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(null);

    try {
      const result = await fileUploadService.uploadFile(
        selectedFile,
        FileTypeCategory.Report,
        null,
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        }
      );

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        navigate('/reports');
      } else {
        setUploadError(result.message || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload New Report
        </Typography>

        <Paper sx={{ p: 3, mt: 2 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <FileUploadUI
                label="Report File"
                onFileSelect={handleFileSelect}
                onValidationError={handleFileValidationError}
                validateFile={validateReportFile}
                accept={fileValidationService.getAcceptString(FileTypeCategory.Report)}
                selectedFile={selectedFile}
                onReset={handleFileReset}
                disabled={isUploading}
                instructions={`Drag & drop report file here (Max ${fileValidationService.getMaxFileSizeMB()}MB), or click to select`}
              />
            </Box>

            {uploadProgress && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Uploading: {uploadProgress.percent}%
                </Typography>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress.percent}%` }}
                  ></div>
                </div>
              </Box>
            )}

            {uploadError && (
              <Box sx={{ mb: 3 }}>
                <Typography color="error">{uploadError}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Report'}
              </button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default ReportUploadPage; 