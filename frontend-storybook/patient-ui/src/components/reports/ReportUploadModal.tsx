import React, { useState, useCallback, useContext } from 'react'; // Combined imports
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '../common/Modal';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
// Import new services and components
import { fileUploadService, UploadProgress, UploadResult } from '../../services/FileUploadService';
import {
  fileValidationService,
  FileTypeCategory,
  ValidationError,
} from '../../services/FileValidationService';
import { FileUploadUI } from '../common/FileUploadUI';
import { LinearProgress, Box, Typography } from '@mui/material'; // For progress display

// Define Report Types (Example - customize based on actual needs)
const REPORT_TYPES = [
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'imaging', label: 'Imaging (X-Ray, CT, MRI)' },
  { value: 'consultation', label: 'Consultation Note' },
  { value: 'pathology', label: 'Pathology Report' },
  { value: 'other', label: 'Other' },
];

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientId?: string | number | null; // Optional: Pre-fill patient if opened from detail page
}

const validationSchema = Yup.object({
  // File validation is now handled by FileUploadUI + FileValidationService
  // We only need to validate that *a* file is present if required, but the UI handles this better.
  // file: Yup.mixed().required('A report file is required.'),
  type: Yup.string()
    .required('Report type is required.')
    .oneOf(
      REPORT_TYPES.map(type => type.value),
      'Invalid report type selected'
    ),
  patientId: Yup.string().optional(), // Keep optional linking validation
});

const ReportUploadModal: React.FC<ReportUploadModalProps> = ({
  isOpen,
  onClose,
  initialPatientId = null,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext); // Get auth context
  // Add null check - though user isn't directly used here yet, it's good practice
  if (!authContext) {
    throw new Error('ReportUploadModal must be used within an AuthProvider');
  }
  const { user } = authContext;

  const formik = useFormik({
    initialValues: {
      file: null as File | null,
      type: '',
      patientId: initialPatientId ? String(initialPatientId) : '',
    },
    validationSchema: validationSchema,
    onSubmit: async values => {
      if (!values.file) {
        // This case should ideally be prevented by disabling the submit button,
        // but we add a check just in case.
        setUploadError('Please select a file to upload.');
        return;
      }
      setUploadError(null);
      setUploadProgress(null); // Reset progress
      setIsUploading(true);

      // --- Use FileUploadService ---
      const result: UploadResult = await fileUploadService.uploadFile(
        values.file,
        FileTypeCategory.Report,
        // Use patientId from formik values, ensure it's a string if present
        values.patientId ? String(values.patientId) : null,
        (progress: UploadProgress) => {
          setUploadProgress(progress);
        }
      );
      // ---------------------------

      setIsUploading(false);
      setUploadProgress(null); // Clear progress after completion/failure

      if (result.success) {
        console.log('Report uploaded successfully!', result.fileUrl);
        formik.resetForm({ values: { ...values, file: null } }); // Reset form but keep patientId if initial
        onClose(); // Close modal on success
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        if (values.patientId) {
          queryClient.invalidateQueries({ queryKey: ['patient-reports', values.patientId] });
        }
      } else {
        console.error('Upload failed:', result.message);
        setUploadError(result.message || 'An unknown error occurred during upload.');
      }
    },
  });

  // --- FileUploadUI Integration Callbacks ---
  const handleFileSelect = useCallback(
    (file: File) => {
      formik.setFieldValue('file', file);
      setUploadError(null); // Clear previous upload errors when a new file is selected
      // Don't clear formik file error here, let validation handle it if needed
    },
    [formik]
  );

  const handleFileValidationError = useCallback(
    (errorMsg: string) => {
      // FileUploadUI displays its own errors. We just need to ensure formik knows the file is invalid.
      formik.setFieldValue('file', null);
      // Optionally, you could set a general uploadError state here too if needed
      // setUploadError(`File validation failed: ${errorMsg}`);
    },
    [formik]
  );

  const handleFileReset = useCallback(() => {
    formik.setFieldValue('file', null);
    setUploadError(null);
  }, [formik]);

  // --- File Validation Function for FileUploadUI ---
  const validateReportFile = useCallback((file: File): ValidationError | null => {
    // Use the singleton service instance
    return fileValidationService.validateFile(file, FileTypeCategory.Report);
  }, []); // No dependencies needed as service and category are constant

  // --- Accept String for FileUploadUI ---
  const reportAcceptString = fileValidationService.getAcceptString(FileTypeCategory.Report);
  // --- End FileUploadUI Integration ---

  // Reset form and error state when modal is closed/opened
  React.useEffect(() => {
    if (isOpen) {
      // Reset patientId based on whether it was provided
      formik.setFieldValue('patientId', initialPatientId ? String(initialPatientId) : '');
    } else {
      // Fully reset form and error when closing
      formik.resetForm();
      setUploadError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPatientId]); // Dependencies adjusted for clarity

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload New Report">
      <form onSubmit={formik.handleSubmit}>
        {/* --- File Upload UI Component --- */}
        <FileUploadUI
          label="Report File"
          onFileSelect={handleFileSelect}
          onValidationError={handleFileValidationError} // Let FileUploadUI display validation errors
          validateFile={validateReportFile}
          accept={reportAcceptString}
          selectedFile={formik.values.file} // Control the displayed file
          onReset={handleFileReset} // Allow resetting the file
          disabled={isUploading}
          instructions={`Drag & drop PDF or DOCX file here (Max ${fileValidationService.getMaxFileSizeMB()}MB), or click to select`}
        />
        {/* Removed dropzone specific error display */}

        {/* Report Type */}
        <div className="mt-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            id="type"
            name="type"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.type}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${formik.touched.type && formik.errors.type ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="" disabled>
              Select type...
            </option>
            {REPORT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {formik.touched.type && formik.errors.type && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.type}</div>
          )}
        </div>

        {/* Optional Patient Linking */}
        <div className="mt-4">
          <label htmlFor="patientId" className="block text-sm font-medium text-gray-700">
            Link to Patient (Optional ID/MRN)
          </label>
          <input
            type="text"
            id="patientId"
            name="patientId"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.patientId}
            placeholder="Enter Patient ID or MRN"
            disabled={!!initialPatientId} // Disable if opened from patient detail page
            className={`mt-1 block w-full border ${formik.touched.patientId && formik.errors.patientId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {formik.touched.patientId && formik.errors.patientId && (
            <div className="text-red-500 text-sm mt-1">{formik.errors.patientId}</div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && uploadProgress && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
            >{`Uploading: ${uploadProgress.percent}%`}</Typography>
            <LinearProgress variant="determinate" value={uploadProgress.percent} />
          </Box>
        )}

        {/* Upload Error Display */}
        {uploadError &&
          !isUploading && ( // Only show upload error if not currently uploading
            <div className="mt-4 p-2 text-sm text-red-700 bg-red-100 rounded-md">
              Upload failed: {uploadError}
            </div>
          )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={!formik.values.file || !formik.isValid || isUploading} // Disable if no file, invalid, or uploading
          >
            {isUploading ? 'Uploading...' : 'Upload Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportUploadModal;
