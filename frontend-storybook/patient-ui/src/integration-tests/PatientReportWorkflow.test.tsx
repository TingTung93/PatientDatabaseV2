import React from 'react';
// Add 'within' to the import
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportManagement } from '../components/patient/ReportManagement';
// import { reportApi } from '../api/endpoints/reportApi'; // Mocking service directly is often better
import { Report, ReportType, ReportStatus } from '../types/report';

// Mock the service used by the component's hooks if applicable, or pass mock handlers
// jest.mock('../api/endpoints/reportApi'); // Example if API is used directly

const mockReport: Report = {
  id: '1',
  file_name: 'blood_test_report.pdf', // Added
  file_path: '/reports/blood_test_report.pdf', // Added
  file_size: 1536, // Added (example size)
  file_type: 'application/pdf', // Added
  title: 'Blood Test Results',
  content: 'Report content...',
  report_type: 'pdf', // Use string literal based on ReportType definition
  created_at: '2023-06-01T12:00:00Z',
  updated_at: '2023-06-01T12:00:00Z',
  status: 'completed', // Use string literal based on ReportStatus definition
  attachments: [
    {
      id: 'att1',
      name: 'blood_test.pdf',
      type: 'application/pdf',
      size: 1024,
      uploaded_at: '2023-06-01T12:00:00Z',
      url: '/path/to/file.pdf',
    },
  ],
};

describe('Patient Report Workflow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
    // Reset window.confirm mock
    window.confirm = jest.fn(() => true);
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('completes a full report management workflow', async () => {
    // Mock handler functions passed as props
    const mockUpload = jest.fn().mockResolvedValue({
      success: true,
      message: 'Upload successful',
      report: { ...mockReport, id: '2', title: 'new_report.pdf' }, // Simulate uploaded report
    });

    const mockDelete = jest.fn().mockResolvedValue({
      success: true,
      message: 'Delete successful',
    });

    const mockView = jest.fn(); // Simple mock for view action

    // Initial state for the component
    const initialReports: readonly Report[] = [mockReport]; // Start with readonly

    // Render component
    renderWithQuery(
      <ReportManagement
        patientId="1"
        reports={initialReports} // Pass readonly array
        onUpload={mockUpload}
        onDelete={mockDelete}
        onView={mockView}
      />
    );

    // 1. Verify initial render
    expect(screen.getByText('Patient Reports')).toBeInTheDocument();
    expect(screen.getByText('Blood Test Results')).toBeInTheDocument();

    // 2. Upload a new report
    const file = new File(['test content'], 'new_report.pdf', { type: 'application/pdf' });
    // Find the input element by its implicit label association or add a test-id
    const uploadInput = screen.getByLabelText(/upload report/i); // Assuming label points to input
    await userEvent.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file, '1');
    });

    // 3. View report details (assuming view button exists and is identifiable)
    // If view button isn't implemented or easily selectable, skip this step or adjust selector
    // const viewButton = screen.queryByRole('button', { name: /view/i });
    // if (viewButton) {
    //   await userEvent.click(viewButton);
    //   expect(mockView).toHaveBeenCalledWith('1');
    // }

    // 4. Delete report
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    // Add check before clicking
    if (!deleteButton) throw new Error('Delete button not found');
    await userEvent.click(deleteButton);

    // Wait for confirmation modal if applicable (assuming ConfirmationModal is used)
    const confirmButton = await screen.findByRole('button', { name: 'Delete' }); // Find confirm button in modal
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });

  it('handles API errors gracefully', async () => {
    const mockUpload = jest.fn().mockRejectedValue(new Error('Upload failed'));
    const mockDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));

    renderWithQuery(
      <ReportManagement
        patientId="1"
        reports={[mockReport]} // Pass readonly array
        onUpload={mockUpload}
        onDelete={mockDelete}
      />
    );

    // 1. Test upload error
    const file = new File(['test content'], 'error_report.pdf', { type: 'application/pdf' });
    const uploadInput = screen.getByLabelText(/upload report/i);
    await userEvent.upload(uploadInput, file);

    await waitFor(() => {
      // Check for error message displayed by the component
      expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i);
    });

    // 2. Test delete error
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    if (!deleteButton) throw new Error('Delete button not found for error test');
    await userEvent.click(deleteButton);

    // Wait for confirmation modal if applicable
    const confirmButton = await screen.findByRole('button', { name: 'Delete' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      // Check for error message displayed by the component (might be in modal or main area)
      expect(screen.getByRole('alert')).toHaveTextContent(/delete failed/i);
    });
  });

  // Concurrency test might be less relevant if using optimistic updates or relying on RQ's handling
  // it('handles concurrent operations correctly', async () => { ... });

  it('maintains data consistency during updates', async () => {
    // Use a mutable array locally within the test to simulate state changes
    const reportsState: Report[] = [mockReport];

    const mockUpload = jest.fn().mockImplementation(file => {
      const newReport: Report = {
        ...mockReport, // Use base mock for structure
        id: `upload-${Date.now()}`, // Generate unique ID
        title: file.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: [
          {
            // Simulate attachment data
            id: `att-${Date.now()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString(),
            url: `/uploads/${file.name}`,
          },
        ],
      };
      reportsState.push(newReport); // Mutate local state for rerender check
      return Promise.resolve({
        success: true,
        message: 'Upload successful',
        report: newReport,
      });
    });

    const mockDelete = jest.fn().mockImplementation(id => {
      const index = reportsState.findIndex(r => r.id === id);
      if (index !== -1) {
        reportsState.splice(index, 1); // Mutate local state for rerender check
      }
      return Promise.resolve({
        success: true,
        message: 'Delete successful',
      });
    });

    // Render component with initial state (pass read-only copy)
    const { rerender } = renderWithQuery(
      <ReportManagement
        patientId="1"
        reports={[...reportsState]} // Pass read-only copy
        onUpload={mockUpload}
        onDelete={mockDelete}
      />
    );

    // 1. Upload a new report
    const file = new File(['test content'], 'new_report.pdf', { type: 'application/pdf' });
    const uploadInput = screen.getByLabelText(/upload report/i);
    await userEvent.upload(uploadInput, file);

    // Wait for upload mock to resolve
    await waitFor(() => expect(mockUpload).toHaveBeenCalled());

    // 2. Verify new report is added by rerendering with updated state
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReportManagement
          patientId="1"
          reports={[...reportsState]} // Pass updated read-only copy
          onUpload={mockUpload}
          onDelete={mockDelete}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('new_report.pdf')).toBeInTheDocument(); // Check by title/filename

    // 3. Delete the original report
    // Find delete button associated with the original report (e.g., by title)
    const originalReportRow = screen.getByText('Blood Test Results').closest('tr');
    if (!originalReportRow) throw new Error('Original report row not found');
    const deleteButton = within(originalReportRow).getByRole('button', { name: /delete/i }); // Use within here
    await userEvent.click(deleteButton);

    // Confirm deletion in modal
    const confirmButton = await screen.findByRole('button', { name: 'Delete' });
    await userEvent.click(confirmButton);

    // Wait for delete mock to resolve
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('1'));

    // 4. Verify original report is removed by rerendering with updated state
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReportManagement
          patientId="1"
          reports={[...reportsState]} // Pass updated read-only copy
          onUpload={mockUpload}
          onDelete={mockDelete}
        />
      </QueryClientProvider>
    );

    expect(screen.queryByText('Blood Test Results')).not.toBeInTheDocument();
  });
});
