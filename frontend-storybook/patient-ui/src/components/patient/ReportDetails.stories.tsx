import type { Meta, StoryObj } from '@storybook/react';
import { ReportDetails } from './ReportDetails';
import { action } from '@storybook/addon-actions';
import { within, userEvent } from '@storybook/testing-library';

const meta: Meta<typeof ReportDetails> = {
  title: 'Patient/ReportDetails',
  component: ReportDetails,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onFetch: { action: 'fetched' },
    onUpdate: { action: 'updated' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof ReportDetails>;

// Mock report data
const mockReport = {
  id: 1,
  type: 'Blood Test',
  file_name: 'blood_test_results.pdf',
  file_path: '/reports/blood_test_results.pdf',
  file_size: 1024 * 1024, // 1MB
  file_type: 'application/pdf',
  patient_id: 123,
  ocr_text: `BLOOD TEST RESULTS
Date: 2024-04-07
Patient: John Doe
MRN: 12345

Complete Blood Count (CBC)
- WBC: 7.2 K/µL
- RBC: 4.8 M/µL
- Hemoglobin: 14.2 g/dL
- Hematocrit: 42%
- Platelets: 250 K/µL

Results within normal range.
No significant abnormalities detected.`,
  metadata: {
    department: 'Hematology',
    physician: 'Dr. Smith',
    priority: 'Normal',
  },
  status: 'completed',
  created_at: '2024-04-07T10:00:00Z',
  updated_at: '2024-04-07T10:30:00Z',
};

// Loading state
export const Loading: Story = {
  args: {
    reportId: 1,
    isLoading: true,
  },
};

// Empty state
export const NoData: Story = {
  args: {
    reportId: 1,
  },
};

// With report data
export const WithData: Story = {
  args: {
    report: mockReport,
    onUpdate: async (reportId, reportData) => {
      action('onUpdate')(reportId, reportData);
      return {
        success: true,
        message: 'Report updated successfully',
        report: { ...mockReport, ...reportData },
      };
    },
    onDelete: async (reportId) => {
      action('onDelete')(reportId);
      return {
        success: true,
        message: 'Report deleted successfully',
      };
    },
  },
};

// Fetching data
export const FetchingData: Story = {
  args: {
    reportId: 1,
    onFetch: async (reportId) => {
      action('onFetch')(reportId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        report: mockReport,
      };
    },
  },
};

// With actions
export const WithActions: Story = {
  args: {
    report: mockReport,
    onUpdate: async (reportId, reportData) => {
      action('onUpdate')(reportId, reportData);
      return {
        success: true,
        message: 'Report updated successfully',
        report: { ...mockReport, ...reportData },
      };
    },
    onDelete: async (reportId) => {
      action('onDelete')(reportId);
      return {
        success: true,
        message: 'Report deleted successfully',
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Click update button
    const updateButton = canvas.getByText(/update report/i);
    await userEvent.click(updateButton);
    
    // Click delete button
    const deleteButton = canvas.getByText(/delete report/i);
    await userEvent.click(deleteButton);
  },
};

// With long OCR text
export const WithLongOCRText: Story = {
  args: {
    report: {
      ...mockReport,
      ocr_text: `${mockReport.ocr_text}

Additional Test Results:
Comprehensive Metabolic Panel (CMP)
- Sodium: 140 mEq/L
- Potassium: 4.0 mEq/L
- Chloride: 102 mEq/L
- CO2: 24 mEq/L
- Glucose: 85 mg/dL
- BUN: 15 mg/dL
- Creatinine: 0.9 mg/dL
- Calcium: 9.5 mg/dL
- Total Protein: 7.0 g/dL
- Albumin: 4.0 g/dL
- Total Bilirubin: 0.8 mg/dL
- Alkaline Phosphatase: 70 U/L
- AST: 25 U/L
- ALT: 30 U/L

Lipid Panel
- Total Cholesterol: 180 mg/dL
- HDL: 55 mg/dL
- LDL: 110 mg/dL
- Triglycerides: 150 mg/dL

All results are within reference ranges.
No further testing recommended at this time.
Follow-up in 6 months recommended.`,
    },
  },
}; 