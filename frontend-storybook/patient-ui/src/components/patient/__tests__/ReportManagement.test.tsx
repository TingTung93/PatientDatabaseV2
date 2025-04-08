import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportManagement } from '../ReportManagement'; // Assuming named export
import { Report, ReportType, ReportStatus } from '../../../types/report';

const mockReport: Report = {
  id: '1',
  file_name: 'blood_test_report.pdf', // Added
  file_path: '/reports/blood_test_report.pdf', // Added
  file_size: 1536, // Added
  file_type: 'application/pdf', // Added
  title: 'Blood Test Results',
  content: 'Report content...',
  report_type: 'lab_result', // Use snake_case
  created_at: '2023-06-01T12:00:00Z', // Use snake_case
  updated_at: '2023-06-01T12:00:00Z', // Use snake_case
  status: 'completed',
  attachments: [
    {
      id: '1',
      name: 'blood_test.pdf', // Use name
      type: 'application/pdf', // Use type
      size: 1024, // Use size
      uploaded_at: '2023-06-01T12:00:00Z', // Use snake_case
      url: '/path/to/file.pdf',
    },
  ],
};

describe('ReportManagement', () => {
  const onUpload = jest.fn();
  const onDelete = jest.fn();
  const onView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(
      <ReportManagement
        isLoading={true}
        patientId="1"
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });

  it('renders empty state when no reports are available', () => {
    render(
      <ReportManagement
        patientId="1"
        reports={[]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    expect(screen.getByText('No reports available')).toBeInTheDocument();
  });

  it('renders reports list when reports are available', () => {
    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    expect(screen.getByText('Blood Test Results')).toBeInTheDocument();
    expect(screen.getByText('Type: LAB_RESULT')).toBeInTheDocument();
    expect(screen.getByText('Status: FINAL')).toBeInTheDocument();
    expect(screen.getByText('Attachment: blood_test.pdf')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    onUpload.mockResolvedValueOnce({
      success: true,
      message: 'Upload successful',
      report: mockReport,
    });

    render(
      <ReportManagement
        patientId="1"
        reports={[]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const input = screen.getByLabelText(/upload report/i);
    await userEvent.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith(file, '1');
    expect(input).toHaveValue('');
  });

  it('handles upload error', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const error = new Error('Upload failed');
    onUpload.mockRejectedValueOnce(error);

    render(
      <ReportManagement
        patientId="1"
        reports={[]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const input = screen.getByLabelText(/upload report/i);
    await userEvent.upload(input, file);

    expect(await screen.findByText('Failed to upload report')).toBeInTheDocument();
  });

  it('handles report deletion', async () => {
    window.confirm = jest.fn(() => true);
    onDelete.mockResolvedValueOnce({ success: true, message: 'Deleted successfully' });

    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('does not delete when confirmation is cancelled', async () => {
    window.confirm = jest.fn(() => false);

    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('handles delete error', async () => {
    window.confirm = jest.fn(() => true);
    const error = new Error('Delete failed');
    onDelete.mockRejectedValueOnce(error);

    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    expect(await screen.findByText('Failed to delete report')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', async () => {
    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const viewButton = screen.getByRole('button', { name: /view/i });
    await userEvent.click(viewButton);

    expect(onView).toHaveBeenCalledWith('1');
  });

  it('disables buttons during deletion', async () => {
    window.confirm = jest.fn(() => true);
    onDelete.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ReportManagement
        patientId="1"
        reports={[mockReport]}
        onUpload={onUpload}
        onDelete={onDelete}
        onView={onView}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    const viewButton = screen.getByRole('button', { name: /view/i });

    await userEvent.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(viewButton).toBeDisabled();
    expect(deleteButton).toHaveTextContent('Deleting...');

    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled();
      expect(viewButton).not.toBeDisabled();
      expect(deleteButton).toHaveTextContent('Delete');
    });
  });
});
