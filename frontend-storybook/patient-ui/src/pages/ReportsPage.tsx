import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { getReports, deleteReport, Report, ReportApiFilters } from '../api/reports';
import { Pagination } from '../components/Pagination';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReportFilters, ReportFilterControls } from '../components/reports/ReportFilterControls';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { showToast } from '../utils/toast';
import { withErrorBoundary } from '../components/common/withErrorBoundary';

const ITEMS_PER_PAGE = 10;

const ReportsPageContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({
    status: undefined,
    startDate: undefined,
    endDate: undefined,
    searchTerm: undefined,
  });
  const [reportToDelete, setReportToDelete] = useState<string | number | null>(null);
  const queryClient = useQueryClient();

  // Only include defined filter values
  const apiFilters: ReportApiFilters = {
    ...(filters.status && { status: filters.status }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.searchTerm && { searchTerm: filters.searchTerm }),
  };

  const {
    data: reportsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reports', currentPage, apiFilters],
    queryFn: () => getReports(apiFilters, currentPage, ITEMS_PER_PAGE),
    placeholderData: previousData => previousData,
  });

  const deleteReportMutation = useMutation<void, Error, string | number>({
    mutationFn: deleteReport,
    onSuccess: () => {
      showToast('Report deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setReportToDelete(null);
    },
    onError: err => {
      showToast(`Failed to delete report: ${err.message}`, 'error');
      setReportToDelete(null);
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (newFilters: ReportFilters) => {
    setCurrentPage(1);
    setFilters(newFilters);
  };

  const handleDeleteClick = (reportId: string | number) => {
    setReportToDelete(reportId);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReportMutation.mutate(reportToDelete);
    }
  };

  const reports = reportsResponse?.data || [];
  const totalItems = reportsResponse?.total || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (error) {
    return <ErrorMessage message={error.message || 'Error loading reports'} />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports Management
      </Typography>

      <ReportFilterControls onFilterChange={handleFilterChange} />

      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report: Report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.file_name}</TableCell>
                    <TableCell>{report.status}</TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<ViewIcon />}>
                        View
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(report.id)}
                        disabled={
                          deleteReportMutation.isPending &&
                          deleteReportMutation.variables === report.id
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No reports found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      <ConfirmationModal
        open={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Report"
        message={`Are you sure you want to delete this report${reportToDelete ? ` (ID: ${reportToDelete})` : ''}? This action cannot be undone.`}
        confirmButtonText="Delete"
        isLoading={deleteReportMutation.isPending}
      />
    </Box>
  );
};

export const ReportsPage = withErrorBoundary(ReportsPageContent);
