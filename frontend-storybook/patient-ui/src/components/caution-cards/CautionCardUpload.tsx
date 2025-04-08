import React, { useState, useCallback } from 'react';
import { Form, Button, Card } from 'antd'; // Keep Antd Form, Button, Card for now
// Remove unused FileUploadService imports, add cautionCardService
// import { fileUploadService, UploadProgress, UploadResult } from '../../services/FileUploadService'; // Removed
import { cautionCardService } from '../../services/cautionCardService'; // Added
import {
  fileValidationService,
  FileTypeCategory,
  ValidationError,
} from '../../services/FileValidationService';
import { FileUploadUI } from '../common/FileUploadUI';
import { LinearProgress, Box, Typography, Alert as MuiAlert } from '@mui/material'; // Use MUI Alert

interface CautionCardUploadProps {
  patientId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const CautionCardUpload: React.FC<CautionCardUploadProps> = ({ 
  patientId,
  onSuccess,
  onError
}): JSX.Element => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Remove state related to fileUploadService progress if not needed by cautionCardService
  // const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null); // Removed (cautionCardService doesn't provide progress)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form] = Form.useForm(); // Keep Antd form instance if needed for other fields potentially

  // --- FileUploadUI Integration Callbacks ---
  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setUploadError(null); // Clear errors on new selection
      // Set the value in the Antd form state to satisfy validation - REMOVED to potentially fix circular ref warning
      // form.setFieldsValue({ file: file.name });
      form.setFields([{ name: 'file', errors: [] }]); // Clear Antd form errors if any
    },
    [form]
  );

  const handleFileValidationError = useCallback(
    (errorMsg: string) => {
      setSelectedFile(null);
      // Display error using state, FileUploadUI shows its own internal error
      setUploadError(`File validation failed: ${errorMsg}`);
      form.setFields([{ name: 'file', errors: [errorMsg] }]); // Optionally sync with Antd form state
    },
    [form]
  );

  const handleFileReset = useCallback(() => {
    setSelectedFile(null);
    setUploadError(null);
    // Also clear the value in the Antd form state - REMOVED
    // form.setFieldsValue({ file: null });
    form.setFields([{ name: 'file', errors: [] }]);
  }, [form]);

  // --- File Validation Function for FileUploadUI ---
  const validateCautionCardFile = useCallback((file: File): ValidationError | null => {
    return fileValidationService.validateFile(file, FileTypeCategory.CautionCard);
  }, []);

  // --- Accept String for FileUploadUI ---
  const cautionCardAcceptString = fileValidationService.getAcceptString(
    FileTypeCategory.CautionCard
  );

  // --- Upload Handler (Antd Form onFinish) ---
  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      setUploadError('Please select an image file (PNG, JPG) to upload.');
      form.setFields([{ name: 'file', errors: ['Please select a file.'] }]);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const result = await cautionCardService.processCautionCardUpload({
        file: selectedFile,
      });

      // Success handling
      console.log('Caution Card processed successfully! ID:', result.id);
      onSuccess?.();
      form.resetFields();
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Upload failed:', error);
      const message =
        error?.response?.data?.message ||
        error.message ||
        'An unknown error occurred during upload.';
      setUploadError(message);
      onError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card title="Upload Caution Card">
      <Form form={form} layout="vertical" onFinish={handleUpload}>
        {/* Hidden Form Item removed - validation handled by selectedFile state check */}
        {/*
         <Form.Item
           name="file"
           hidden
           rules={[{ required: true, message: 'Please select a caution card image' }]}
         >
           <input type="text" value={selectedFile ? selectedFile.name : ''} readOnly />
         </Form.Item>
        */}

        <FileUploadUI
          label="Caution Card Image"
          onFileSelect={handleFileSelect}
          onValidationError={handleFileValidationError}
          validateFile={validateCautionCardFile}
          accept={cautionCardAcceptString}
          selectedFile={selectedFile}
          onReset={handleFileReset}
          disabled={isUploading}
          data-testid="caution-card-upload" // Added for testing
          instructions={`Drag & drop PNG or JPG file here (Max ${fileValidationService.getMaxFileSizeMB()}MB), or click to select`}
        />

        {/* Upload Progress - Removed as cautionCardService doesn't provide progress */}
        {/* {isUploading && uploadProgress && (
          <Box sx={{ width: '100%', my: 2 }}>
             <Typography variant="body2" color="text.secondary">{`Uploading: ${uploadProgress.percent}%`}</Typography>
             <LinearProgress variant="determinate" value={uploadProgress.percent} />
          </Box>
        )} */}

        {/* Upload Error Display */}
        {uploadError && !isUploading && (
          <MuiAlert severity="error" sx={{ mt: 2 }}>
            {uploadError}
          </MuiAlert>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isUploading}
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? 'Uploading...' : 'Upload Caution Card'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
