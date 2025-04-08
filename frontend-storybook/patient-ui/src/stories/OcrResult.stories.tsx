import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { OcrResult } from '../components/ocr/OcrResult';
// import { AnalysisResult } from '../types/textAnalysis'; // Remove unused
import { OcrStatus, OcrResult as OcrResultType } from '../types/ocr';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock responses for each endpoint
const mockAnalysisResponse = {
  entities: [
    { text: 'John Smith', type: 'PERSON', confidence: 0.95, startIndex: 33, endIndex: 43 },
    { text: 'Diabetes Type 2', type: 'CONDITION', confidence: 0.88, startIndex: 108, endIndex: 122 },
    { text: 'Metformin', type: 'MEDICATION', confidence: 0.92, startIndex: 245, endIndex: 254 },
    { text: 'Blood Pressure', type: 'TEST', confidence: 0.85, startIndex: 140, endIndex: 153 },
  ],
  keyPhrases: [
    'patient presents with elevated blood pressure',
    'prescribed Metformin for diabetes management',
    'follow-up appointment scheduled',
  ],
  sentiment: {
    score: 0.6,
    label: 'neutral',
  },
};

const mockStructuredDataResponse = {
  patientInfo: {
    name: 'John Smith',
    dob: '1980-05-15',
    mrn: 'MRN123456',
  },
  labResults: [
    {
      testName: 'Blood Pressure',
      value: '140/90',
      unit: 'mmHg',
      referenceRange: '120/80 mmHg',
    },
    {
      testName: 'Blood Glucose',
      value: '126',
      unit: 'mg/dL',
      referenceRange: '70-99 mg/dL',
    },
  ],
  medications: [
    {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
    },
  ],
  diagnoses: [
    'Type 2 Diabetes Mellitus',
    'Hypertension',
  ],
};

const mockSuggestionsResponse = {
  suggestions: [
    'Consider adding blood pressure monitoring schedule',
    'Review medication adherence at next visit',
    'Schedule HbA1c test',
  ],
};

const meta = {
  title: 'Components/OcrResult',
  component: OcrResult,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        // Handler for text analysis endpoint
        http.post('/api/text-analysis/analyze', () => {
          return HttpResponse.json(mockAnalysisResponse);
        }),
        // Handler for structured data endpoint
        http.post('/api/text-analysis/extract-structured', () => {
          return HttpResponse.json(mockStructuredDataResponse);
        }),
        // Handler for suggestions endpoint
        http.post('/api/text-analysis/suggestions', () => {
          return HttpResponse.json(mockSuggestionsResponse);
        }),
      ],
    },
  },
} satisfies Meta<typeof OcrResult>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockResult: OcrResultType = {
  id: 123,
  file_name: 'patient_record.pdf',
  file_path: 'https://picsum.photos/800/1000',
  file_size: 1024,
  file_type: 'application/pdf',
  status: OcrStatus.Completed,
  text: `Patient Visit Summary
Date: May 15, 2023
Patient: John Smith
MRN: 123456
DOB: 05/15/1980

Chief Complaint:
Patient presents for follow-up of diabetes and hypertension.

Vital Signs:
- Blood Pressure: 140/90 mmHg
- Heart Rate: 72 bpm
- Temperature: 98.6°F

Lab Results:
- Blood Glucose: 126 mg/dL (Ref: 70-99 mg/dL)
- HbA1c: 7.2% (Ref: <6.5%)

Assessment:
1. Type 2 Diabetes Mellitus - Fair control
2. Hypertension - Elevated

Plan:
1. Continue Metformin 500mg twice daily
2. Schedule follow-up in 3 months
3. Monitor blood pressure daily
4. Lifestyle modifications discussed`,
  confidence: 0.92,
  created_at: '2023-05-15T10:30:00Z',
  updated_at: '2023-05-15T10:30:05Z',
  metadata: {},
};

export const Default: Story = {
  args: {
    result: mockResult,
  },
};

export const Processing: Story = {
  args: {
    result: {
      ...mockResult,
      status: OcrStatus.Processing,
    },
  },
};

export const Failed: Story = {
  args: {
    result: {
      ...mockResult,
      status: OcrStatus.Failed,
      error: 'Failed to process document. Please try again.',
    },
  },
};

export const NoText: Story = {
  args: {
    result: {
      ...mockResult,
      status: OcrStatus.Completed,
      text: null,
      confidence: 0,
    },
  },
}; 