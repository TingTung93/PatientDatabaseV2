import React, { useState } from 'react';
import { usePatientReports, useDeleteReport } from '../../hooks/useReports';
import { Report } from '../../types/report'; // Correct path
import Pagination from '../common/Pagination'; // Correct path assumed default
import ConfirmationModal from '../common/ConfirmationModal'; // Correct path assumed default
import ReportUploadModal from '../reports/ReportUploadModal'; // Correct path assumed default
import { ReportsListSkeleton } from '../common/LoadingSkeleton'; // Assuming named export
import { FallbackError } from '../common/FallbackError'; // Correct path and name
import { QueryObserverResult } from '@tanstack/react-query'; // Import for refetch type if needed
import { PaginatedResponse } from '../../types/common'; // Import PaginatedResponse

interface PatientReportsListProps {
  patientId: string;
}

const REPORTS_PER_PAGE = 5; // Lower limit for embedding in detail page

export const PatientReportsList: React.FC<PatientReportsListProps> = ({
  patientId,
}): JSX.Element => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const {
    data: reportsData,
    isLoading,
    error,
    isFetching,
    refetch, // Destructure refetch
  }: {
    // Add explicit type annotation for the hook result
    data: PaginatedResponse<Report> | undefined;
    isLoading: boolean;
    error: Error | null;
    isFetching: boolean;
    refetch: () => Promise<QueryObserverResult<PaginatedResponse<Report>, Error>>;
  } = usePatientReports(patientId, currentPage, REPORTS_PER_PAGE);

  const deleteReportMutation = useDeleteReport();

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  const openDeleteModal = (report: Report): void => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = (): void => {
    setReportToDelete(null);
    setShowDeleteModal(false);
  };

  const confirmDelete = (): void => {
    if (reportToDelete) {
      deleteReportMutation.mutate(String(reportToDelete.id), {
        // Ensure ID is string
        onSuccess: () => {
          console.log(`Report ${reportToDelete.id} deleted successfully.`);
          closeDeleteModal();
          // Optionally refetch data after delete
          refetch();
        },
        onError: (err: Error) => {
          // Add Error type
          console.error('Error deleting report:', err);
          // Optionally show error to user
          closeDeleteModal();
        },
      });
    }
  };

  // Correctly access total and calculate totalPages
  const totalReports = reportsData?.total ?? 0;
  const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE);

  if (isLoading) {
    return <ReportsListSkeleton />;
  }

  if (error) {
    // Pass error and refetch to FallbackError
    return <FallbackError error={error as Error} resetErrorBoundary={refetch} />;
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Associated Reports</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="text-sm bg-blue-500 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded"
        >
          Upload Report
        </button>
      </div>

      <ReportUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          // Refetch when modal closes after potential upload
          refetch();
        }}
        initialPatientId={patientId}
        // onSuccess prop removed as it's not supported by the modal
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Confirm Deletion"
        message={`Are you sure you want to delete Report ID: ${reportToDelete?.id}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        confirmText="Delete"
        cancelText="Cancel"
        isConfirming={deleteReportMutation.isPending}
      />

      {isFetching && !isLoading && <p>Updating...</p>}

      {!isLoading && !error && (
        <>
          {reportsData?.data && reportsData.data.length > 0 ? (
            <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th scope="col" className="relative px-4 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(reportsData?.data || []).map(
                    (
                      report: Report // Add fallback array
                    ) => (
                      <tr key={report.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {report.id}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {report.report_type ?? 'N/A'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {report.created_at
                            ? new Date(report.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          {/* Add View functionality if needed */}
                          {/* <a href="#" className="text-indigo-600 hover:text-indigo-900 mr-3">View</a> */}
                          <button
                            onClick={() => openDeleteModal(report)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteReportMutation.isPending}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reports found for this patient.</p>
          )}

          {/* Pagination */}
          {totalReports > REPORTS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages} // Use calculated totalPages
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PatientReportsList;
