import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Typography, Paper, Container, Box } from '@mui/material';
import { FileUploadUI } from '../components/common/FileUploadUI';
import { fileValidationService, FileTypeCategory } from '../services/FileValidationService';
import { fileUploadService, UploadProgress } from '../services/FileUploadService';

// Define Report Types (matching the API)
const REPORT_TYPES = [
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'imaging', label: 'Imaging (X-Ray, CT, MRI)' },
  { value: 'consultation', label: 'Consultation Note' },
  { value: 'pathology', label: 'Pathology Report' },
  { value: 'other', label: 'Other' },
];

export const ReportUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('');
  const [patientId, setPatientId] = useState('');
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
    if (!selectedFile || !reportType) {
      setUploadError('Please select a file and report type');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', reportType);
      if (patientId) {
        formData.append('patientId', patientId);
      }

      const result = await fileUploadService.uploadFile(
        selectedFile,
        FileTypeCategory.Report,
        patientId || 'unknown',
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        }
      );

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        if (patientId) {
          queryClient.invalidateQueries({ queryKey: ['patient-reports', patientId] });
        }
        navigate('/reports');
      } else {
        setUploadError(result.message || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
                instructions={`Drag & drop PDF or DOCX file here (Max ${fileValidationService.getMaxFileSizeMB()}MB), or click to select`}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Report Type
              </Typography>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={isUploading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="">Select type...</option>
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Link to Patient (Optional)
              </Typography>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter Patient ID or MRN"
                disabled={isUploading}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                disabled={!selectedFile || !reportType || isUploading}
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