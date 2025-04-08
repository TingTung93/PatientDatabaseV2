import type { Meta, StoryObj } from '@storybook/react';
import { ReportManagement } from '../components/patient/ReportManagement';
import { Report, ReportType, ReportStatus } from '../types/report';

// Mock report data
const mockReport: Report = {
  id: '1',
  file_name: 'blood_test_report.pdf', // Added
  file_path: '/reports/blood_test_report.pdf', // Added
  file_size: 262144, // Added (example size 256KB)
  file_type: 'application/pdf', // Added
  title: 'Blood Test Results',
  content: 'Report content...',
  report_type: 'pdf', // Use string literal based on ReportType definition
  created_at: '2023-06-01T12:00:00Z',
  updated_at: '2023-06-01T12:00:00Z',
  status: 'completed', // Use string literal based on ReportStatus definition
  attachments: [
    {
      id: '1',
      name: 'blood_test_results.pdf',
      type: 'application/pdf',
      size: 1024 * 256,
      uploaded_at: '2023-06-01T12:00:00Z',
      url: '/path/to/file.pdf',
    },
    {
      id: '2',
      name: 'xray_chest.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024 * 1.5,
      uploaded_at: '2023-06-01T12:00:00Z',
      url: '/path/to/file.jpg',
    },
    {
      id: '3',
      name: 'consultation_notes.txt',
      type: 'text/plain',
      size: 1024 * 5,
      uploaded_at: '2023-06-01T12:00:00Z',
      url: '/path/to/file.txt',
    },
  ],
};

const meta: Meta<typeof ReportManagement> = {
  title: 'Patient/ReportManagement',
  component: ReportManagement,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Stories demonstrating patient report management functionality',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ReportManagement>;

// Story for uploading a new report
export const UploadReport: Story = {
  args: {
    patientId: '1',
    onUpload: async (file: File, patientId: string) => {
      console.log('Uploading report:', {
        fileName: file.name,
        patientId,
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Report uploaded successfully',
        report: mockReport,
      };
    },
  },
};

// Story for deleting a report
export const DeleteReport: Story = {
  args: {
    patientId: '1',
    reports: [mockReport],
    onDelete: async (reportId: string) => {
      console.log('Deleting report:', reportId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Report deleted successfully',
      };
    },
  },
};

// Story for viewing a report
export const ViewReport: Story = {
  args: {
    patientId: '1',
    reports: [mockReport],
    onView: (reportId: string) => {
      console.log('Viewing report:', reportId);
    },
  },
};

// Story for error handling
export const ErrorHandling: Story = {
  args: {
    patientId: '1',
    onUpload: async () => {
      throw new Error('Failed to upload report');
    },
  },
};

// Story for loading state
export const LoadingState: Story = {
  args: {
    patientId: '1',
    isLoading: true,
    reports: [mockReport],
  },
};
