/**
 * @module ReportManagement
 * @description A component for managing patient reports, including uploading, viewing, and deleting reports.
 *
 * @example
 * ```tsx
 * <ReportManagement
 *   patientId="123"
 *   reports={patientReports}
 *   isLoading={false}
 *   onUpload={(file, patientId) => handleUpload(file, patientId)}
 *   onDelete={(reportId) => handleDelete(reportId)}
 *   onView={(reportId) => handleView(reportId)}
 * />
 * ```
 */

import React, { useState, useRef } from 'react';
import { Report } from '../../types/report';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * Props for the ReportManagement component
 * @interface ReportManagementProps
 */
interface ReportManagementProps {
  /** The ID of the patient whose reports are being managed */
  patientId?: string;
  /** Array of reports to display */
  reports?: readonly Report[]; // Use readonly array
  /** Loading state indicator */
  isLoading?: boolean;
  /** Callback function for handling file uploads */
  onUpload?: (
    file: File,
    patientId: string
  ) => Promise<{
    success: boolean;
    message: string;
    report: Report;
  }>;
  /** Callback function for handling report deletion */
  onDelete?: (reportId: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  /** Callback function for handling report viewing */
  onView?: (reportId: string) => void;
}

/**
 * Props for the ReportItem subcomponent
 * @interface ReportItemProps
 */
interface ReportItemProps {
  /** The report to display */
  report: Readonly<Report>; // Use readonly report
  /** Callback function for handling report deletion */
  onDelete?: (reportId: string) => Promise<{ success: boolean; message: string }>;
  /** Callback function for handling report viewing */
  onView?: (reportId: string) => void;
}

/**
 * A component that displays a single report item with actions
 * @component
 */
const ReportItem: React.FC<ReportItemProps> = ({ report, onDelete, onView }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles the deletion of a report with confirmation
   * @async
   */
  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this report?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(String(report.id)); // Ensure ID is passed as string
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="report-item border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
          <p className="text-sm text-gray-600">Type: {report.report_type}</p>
          <p className="text-sm text-gray-600">Status: {report.status}</p>
          <p className="text-sm text-gray-600">
            Created: {new Date(report.created_at).toLocaleDateString()}
          </p>
          {report.attachments && report.attachments.length > 0 && (
            <p className="text-sm text-gray-600">
              Attachment: {report.attachments?.[0]?.name} {/* Use optional chaining */}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {onView && (
            <button
              onClick={() => onView(String(report.id))} // Ensure ID is passed as string
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
              disabled={isDeleting}
            >
              View
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * The main ReportManagement component
 * @component
 * @description Provides functionality for managing patient reports including:
 * - Uploading new reports
 * - Viewing existing reports
 * - Deleting reports
 * - Error handling
 * - Loading states
 */
export const ReportManagement: React.FC<ReportManagementProps> = ({
  patientId,
  reports = [],
  isLoading = false,
  onUpload,
  onDelete,
  onView,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file upload events
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patientId || !onUpload) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await onUpload(file, patientId);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload report');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="report-management p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Patient Reports</h2>
          {patientId && onUpload && (
            <div className="upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="report-file-input"
                disabled={isUploading}
              />
              <label
                htmlFor="report-file-input"
                className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload Report'}
              </label>
              {uploadError && (
                <div className="mt-2 text-red-600 text-sm" role="alert">
                  {uploadError}
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner size="large" message="Loading reports..." />
        ) : reports.length > 0 ? (
          <div className="reports-list space-y-4">
            {(reports || []).map(
              (
                report // Add fallback for reports array
              ) => (
                <ReportItem
                  key={report.id}
                  report={report}
                  {...(onDelete && { onDelete })} // Conditionally spread onDelete
                  {...(onView && { onView })} // Conditionally spread onView
                />
              )
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No reports available</div>
        )}
      </div>
    </ErrorBoundary>
  );
};
