import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/usePatients';
import { Patient } from '../types/patient';
import { FilterCriteria } from '../components/search/FilterBar';
import { usePatientFilters } from '../hooks/usePatientFilters';
import { VirtualizedPatientList } from '../components/patients/VirtualizedPatientList';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Pagination } from '../components/common/Pagination';
import { FilterBar } from '../components/search/FilterBar';
import { ErrorBoundary } from 'react-error-boundary'; // Import ErrorBoundary
import { FallbackError } from '../components/common/FallbackError'; // Import FallbackError
import { LoadingSpinner } from '../components/common/LoadingSpinner'; // Import LoadingSpinner
import { Button } from '../components/common/Button'; // Assuming Button exists

const ITEMS_PER_PAGE = 20;

// Error logging function for ErrorBoundary
const logError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Replace with your actual error logging service (e.g., Sentry, LogRocket)
  console.error('ErrorBoundary caught an error:', error, errorInfo);
  // Example: Send to a logging service
  // logService.log({
  //   error: error.message,
  //   stack: error.stack,
  //   componentStack: errorInfo.componentStack // Handle potential null
  // });
};

export const PatientsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [patientToDelete, setPatientToDelete] = useState<string | number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { filters, setFilters, resetFilters, getQueryParams } = usePatientFilters();

  // Fetch patients based on current page and filters
  const {
    data: patientData,
    isLoading,
    error,
    refetch,
  } = usePatients(currentPage, ITEMS_PER_PAGE, filters);
  const deletePatientMutation = useDeletePatient();

  const patients = patientData?.data || [];
  const totalPages = Math.ceil((patientData?.total || 0) / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = useCallback((id: string | number) => {
    setPatientToDelete(id);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (patientToDelete !== null) {
      deletePatientMutation.mutate(patientToDelete, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setPatientToDelete(null);
          // Optionally refetch or optimistically update
        },
        onError: err => {
          console.error('Delete failed:', err);
          setShowDeleteModal(false);
          setPatientToDelete(null);
          // TODO: Show error toast/message to user
        },
      });
    }
  }, [patientToDelete, deletePatientMutation]);

  const handleFilterChange = useCallback(
    (newFilters: FilterCriteria) => {
      setCurrentPage(1); // Reset to first page on filter change
      setFilters(newFilters);
    },
    [setFilters]
  );

  return (
    <ErrorBoundary FallbackComponent={FallbackError} onError={logError}>
      <div className="patients-page p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Patients</h1>
          <Link to="/patients/new">
            <Button variant="primary">Create New Patient</Button>
          </Link>
        </div>

        <FilterBar onFilterChange={handleFilterChange} />

        <div className="mt-6">
          {isLoading && <LoadingSpinner message="Loading patients..." />}
          {error && <FallbackError error={error} resetErrorBoundary={refetch} />}

          {!isLoading && !error && patients.length > 0 && (
            <VirtualizedPatientList
              patients={patients}
              onDelete={handleDeleteClick}
              isDeleting={deletePatientMutation.isPending} // Use isPending
              // Conditionally pass deletingId only when pending and ID matches
              {...(deletePatientMutation.isPending &&
                patientToDelete && { deletingId: patientToDelete })}
            />
          )}

          {!isLoading && !error && patients.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No patients found matching your criteria.
            </div>
          )}
        </div>

        {totalPages > 1 && !isLoading && !error && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            // Removed className prop
          />
        )}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Confirm Deletion"
          message={`Are you sure you want to delete Patient ID: ${patientToDelete}? This action cannot be undone.`}
          confirmText="Delete"
          isConfirming={deletePatientMutation.isPending} // Use isPending
        />
      </div>
    </ErrorBoundary>
  );
};

export default PatientsPage;
