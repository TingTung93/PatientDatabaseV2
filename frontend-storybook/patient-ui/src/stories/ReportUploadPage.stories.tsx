import type { Meta, StoryObj } from '@storybook/react';
import { ReportUploadPage } from '../pages/ReportUploadPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component to provide necessary context
const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

const meta = {
  title: 'Pages/ReportUploadPage',
  component: ReportUploadPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ReportUploadPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {};

// With mock file selected
export const WithFileSelected: Story = {
  parameters: {
    mockData: {
      selectedFile: new File(['test content'], 'test-report.pdf', { type: 'application/pdf' }),
      reportType: 'blood_test',
    },
  },
};

// With validation error
export const WithValidationError: Story = {
  parameters: {
    mockData: {
      selectedFile: new File(['test content'], 'invalid.exe', { type: 'application/x-msdownload' }),
      error: 'Invalid file type. Please upload a PDF or DOCX file.',
    },
  },
};

// Uploading state
export const Uploading: Story = {
  parameters: {
    mockData: {
      selectedFile: new File(['test content'], 'test-report.pdf', { type: 'application/pdf' }),
      reportType: 'blood_test',
      isUploading: true,
      uploadProgress: {
        percent: 45,
        loaded: 450000,
        total: 1000000,
      },
    },
  },
};

// With patient ID linked
export const WithPatientLinked: Story = {
  parameters: {
    mockData: {
      selectedFile: new File(['test content'], 'test-report.pdf', { type: 'application/pdf' }),
      reportType: 'blood_test',
      patientId: 'PAT123',
    },
  },
};

// Upload error state
export const WithUploadError: Story = {
  parameters: {
    mockData: {
      selectedFile: new File(['test content'], 'test-report.pdf', { type: 'application/pdf' }),
      reportType: 'blood_test',
      uploadError: 'Failed to upload file. Please try again.',
    },
  },
}; 