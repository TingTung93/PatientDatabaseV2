import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, Space, Alert, Spin, message } from 'antd';
import { ReportCard } from '../components/reports/ReportCard';
// Use the updated Report type definition
import { Report, ReportStatus, ReportType } from '../types/report';
import { PaginatedResponse } from '../types/common';
import { usePatientReports, useDeleteReport } from '../hooks/useReports';
import ReportUploadModal from '../components/reports/ReportUploadModal'; // Import the modal
const { Search } = Input;

// Update options based on the ReportType definition in report.ts
const reportTypeOptions = [
  // Assuming these are the relevant types based on API doc examples/usage
  { value: 'blood' as ReportType, label: 'Blood Test' },
  { value: 'general' as ReportType, label: 'General' },
  { value: 'lab' as ReportType, label: 'Lab' },
  { value: 'imaging' as ReportType, label: 'Imaging' },
  { value: 'surgery' as ReportType, label: 'Surgery' },
  { value: 'consultation' as ReportType, label: 'Consultation' },
  // Add others if needed, ensure values match potential strings in report.report_type
];

// Update options based on ReportStatus definition in report.ts
const statusOptions = [
  { value: 'pending' as ReportStatus, label: 'Pending' },
  { value: 'processing' as ReportStatus, label: 'Processing' },
  { value: 'completed' as ReportStatus, label: 'Completed' },
  { value: 'error' as ReportStatus, label: 'Error' },
];

export const PatientReportsPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // State for modal visibility
  const {
    data: reportsResponse,
    isLoading: isLoadingReports,
    error: reportsError,
  } = usePatientReports(patientId!, 1, 100);

  const { mutate: deleteReportMutate, isPending: isDeletingReport } = useDeleteReport();

  const reports = reportsResponse?.data || [];
  const totalReports = reportsResponse?.total || 0;

  // Filter reports (Client-side) - Using correct property names
  const filteredReports = reports.filter((report: Report) => {
    const titleMatch = report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    // Use 'content' for searching text content
    const contentMatch = report.content?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchesSearch = searchTerm === '' || titleMatch || contentMatch;

    // Use 'report_type' for filtering by type
    const matchesType = !selectedType || report.report_type === selectedType;
    // 'status' is correct
    const matchesStatus = !selectedStatus || report.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort reports
  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  // Handlers
  const handleSearch = (value: string) => setSearchTerm(value);
  const handleTypeChange = (value: ReportType | null) => setSelectedType(value);
  const handleStatusChange = (value: ReportStatus | null) => setSelectedStatus(value);
  const handleViewReport = (reportId: string | number) => navigate(`/reports/${reportId}`);
  const handleEditReport = (reportId: string | number) => navigate(`/reports/${reportId}/edit`);

  const handleDeleteReport = (reportId: string | number) => {
    deleteReportMutate(reportId, {
      onSuccess: () => {
        message.success('Report deleted successfully');
      },
      onError: error => {
        console.error('Failed to delete report:', error);
        message.error(`Failed to delete report: ${error.message}`);
      },
    });
  };

  const handleCreateReport = () => navigate(`/patients/${patientId}/reports/new`);
  const handleBackToPatient = () => navigate(`/patients/${patientId}`);
  const handleOpenUploadModal = () => setIsUploadModalOpen(true);
  const handleCloseUploadModal = () => setIsUploadModalOpen(false);

  // Loading and Error States
  if (isLoadingReports) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Spin size="large" />
      </div>
    );
  }

  if (reportsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card title="Error" className="max-w-7xl mx-auto p-6">
          <Alert
            message="Error Loading Reports"
            description={reportsError.message || 'Could not fetch reports for this patient.'}
            type="error"
            showIcon
            className="mb-4"
          />
          <Button onClick={handleBackToPatient}>Back to Patient</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card title={`Patient Reports (ID: ${patientId})`} className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Space direction="vertical" className="w-full">
            <div className="flex flex-wrap gap-4">
              <Search
                placeholder="Search reports..."
                allowClear
                onSearch={handleSearch}
                onChange={e => handleSearch(e.target.value)}
                loading={isLoadingReports}
                className="flex-grow sm:flex-grow-0 sm:w-auto md:max-w-md"
              />
              <Select<ReportType | null>
                placeholder="Filter by type"
                allowClear
                value={selectedType}
                onChange={handleTypeChange}
                options={reportTypeOptions}
                className="min-w-[150px] sm:min-w-[200px]"
              />
              <Select<ReportStatus | null>
                placeholder="Filter by status"
                allowClear
                value={selectedStatus}
                onChange={handleStatusChange}
                options={statusOptions}
                className="min-w-[150px] sm:min-w-[200px]"
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">
                Total: {totalReports} report{totalReports !== 1 ? 's' : ''}
                {(searchTerm || selectedType || selectedStatus) &&
                  ` (Showing ${sortedReports.length})`}
              </span>
              <Space>
                <Button
                  type="default" // Or primary, depending on design preference
                  onClick={handleOpenUploadModal}
                >
                  Upload Report
                </Button>
                <Button type="primary" onClick={handleCreateReport}>
                  Create New Report
                </Button>
              </Space>
            </div>
          </Space>
        </div>

        <Spin spinning={isDeletingReport}>
          <div className="space-y-4">
            {sortedReports.map(report => (
              // ReportCard should now accept the correct Report type
              <ReportCard
                key={report.id}
                report={report}
                onView={() => handleViewReport(report.id)}
                onEdit={() => handleEditReport(report.id)}
                onDelete={() => handleDeleteReport(report.id)}
              />
            ))}
            {sortedReports.length === 0 && (
              <Alert
                message={
                  reports.length === 0
                    ? 'No reports exist for this patient.'
                    : 'No reports match your current filters.'
                }
                description={
                  reports.length === 0
                    ? 'You can create a new report.'
                    : 'Try adjusting your search or filters.'
                }
                type="info"
                showIcon
              />
            )}
          </div>
        </Spin>
      </Card>
      <ReportUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </div>
  );
};

export default PatientReportsPage;
