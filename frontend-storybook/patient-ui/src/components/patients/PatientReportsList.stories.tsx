import type { Meta, StoryObj } from '@storybook/react';
import { PatientReportsList } from './PatientReportsList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Report, ReportType, ReportStatus } from '../../types/report';

// Create a new QueryClient for each story
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component to provide query client
const WithQueryClient = (Story: React.ComponentType) => (
  <QueryClientProvider client={queryClient}>
    <Story />
  </QueryClientProvider>
);

const meta: Meta<typeof PatientReportsList> = {
  title: 'Patient/PatientReportsList',
  component: PatientReportsList,
  decorators: [Story => WithQueryClient(Story)],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PatientReportsList>;

// Mock report data
const mockReports: Report[] = [
  {
    id: 'rep-1',
    file_name: 'blood_test_1_report.pdf',
    file_path: '/reports/blood_test_1_report.pdf',
    file_size: 1024 * 1024 + 512,
    file_type: 'application/pdf',
    title: 'Blood Test 1',
    content: 'Detailed results for blood test 1...',
    report_type: 'pdf',
    status: 'completed',
    created_at: '2024-04-07T10:00:00Z',
    updated_at: '2024-04-07T10:30:00Z',
    attachments: [
      {
        id: 'att-1',
        name: 'blood_test_1.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
        url: '/uploads/blood_test_1.pdf',
        uploaded_at: '2024-04-07T10:00:00Z',
      },
    ],
  },
  {
    id: 'rep-2',
    file_name: 'chest_xray_report.jpg',
    file_path: '/reports/chest_xray_report.jpg',
    file_size: 2 * 1024 * 1024 + 1024,
    file_type: 'image/jpeg',
    title: 'Chest X-Ray',
    content: 'Radiology report for chest X-Ray...',
    report_type: 'pdf',
    status: 'pending',
    created_at: '2024-04-06T15:00:00Z',
    updated_at: '2024-04-06T15:30:00Z',
    attachments: [
      {
        id: 'att-2',
        name: 'chest_xray.jpg',
        size: 2 * 1024 * 1024,
        type: 'image/jpeg',
        url: '/uploads/chest_xray.jpg',
        uploaded_at: '2024-04-06T15:00:00Z',
      },
    ],
  },
  {
    id: 'rep-3',
    file_name: 'brain_mri_report.dcm',
    file_path: '/reports/brain_mri_report.dcm',
    file_size: 50 * 1024 * 1024 + 2048,
    file_type: 'application/dicom',
    title: 'Brain MRI',
    content: 'Detailed MRI report...',
    report_type: 'pdf',
    status: 'completed',
    created_at: '2024-04-05T09:00:00Z',
    updated_at: '2024-04-05T10:00:00Z',
    attachments: [
      {
        id: 'att-3',
        name: 'brain_mri.dcm',
        size: 50 * 1024 * 1024,
        type: 'application/dicom',
        url: '/uploads/brain_mri.dcm',
        uploaded_at: '2024-04-05T09:00:00Z',
      },
    ],
  },
];

// Mock the usePatientReports hook
const mockUsePatientReports = (data: Report[], loading = false, error: Error | null = null) => {
  // @ts-ignore - Mocking for storybook
  window.__mockUsePatientReports = {
    data: {
      data,
      pagination: {
        totalItems: data.length,
        totalPages: Math.ceil(data.length / 5),
        currentPage: 1,
      },
    },
    isLoading: loading,
    error,
    isFetching: false,
  };
};

// Loading state
export const Loading: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: { isLoading: true },
      },
    ],
  },
};

// Empty state
export const NoReports: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: {
          data: {
            data: [],
            pagination: {
              totalItems: 0,
              totalPages: 1,
              currentPage: 1,
            },
          },
          isLoading: false,
        },
      },
    ],
  },
};

// With reports
export const WithReports: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: {
          data: {
            data: mockReports,
            pagination: {
              totalItems: mockReports.length,
              totalPages: Math.ceil(mockReports.length / 5),
              currentPage: 1,
            },
          },
          isLoading: false,
        },
      },
    ],
  },
};

// With pagination
export const WithPagination: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: {
          data: {
            data: [...mockReports, ...mockReports, ...mockReports], // 9 reports
            pagination: {
              totalItems: 9,
              totalPages: 2,
              currentPage: 1,
            },
          },
          isLoading: false,
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the table to be rendered
    await canvas.findByRole('table');

    // Find and click next page button
    const nextButton = canvas.getByLabelText(/next page/i);
    await userEvent.click(nextButton);
  },
};

// With delete interaction
export const WithDelete: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: {
          data: {
            data: mockReports,
            pagination: {
              totalItems: mockReports.length,
              totalPages: 1,
              currentPage: 1,
            },
          },
          isLoading: false,
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and click delete button for first report
    const deleteButton = canvas.getAllByText(/delete/i)[0];
    if (deleteButton) {
      // Add check before clicking
      await userEvent.click(deleteButton);
    }

    // Verify confirmation modal appears
    const confirmationModal = await canvas.findByRole('dialog');
    expect(confirmationModal).toBeInTheDocument();

    // Find and click confirm button
    const confirmButton = within(confirmationModal).getByText(/delete/i);
    await userEvent.click(confirmButton);
  },
};

// With upload interaction
export const WithUpload: Story = {
  args: {
    patientId: '123',
  },
  parameters: {
    mockData: [
      {
        hook: 'usePatientReports',
        data: {
          data: {
            data: mockReports,
            pagination: {
              totalItems: mockReports.length,
              totalPages: 1,
              currentPage: 1,
            },
          },
          isLoading: false,
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and click upload button
    const uploadButton = canvas.getByText(/upload report/i);
    await userEvent.click(uploadButton);

    // Verify upload modal appears
    const uploadModal = await canvas.findByRole('dialog');
    expect(uploadModal).toBeInTheDocument();
  },
};
