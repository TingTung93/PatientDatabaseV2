import type { Meta, StoryObj } from '@storybook/react';
import { OcrResult } from '../../components/ocr/OcrResult';
import { OcrStatus } from '../../types/ocr';
import { action } from '@storybook/addon-actions';

const meta = {
  title: 'OCR/OcrResult',
  component: OcrResult,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '800px' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof OcrResult>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockResult = {
  id: 1,
  file_name: 'test-document.pdf',
  file_path: '/uploads/test-document.pdf',
  file_size: 1024 * 1024,
  file_type: 'application/pdf',
  status: OcrStatus.Completed,
  text: 'Sample extracted text from the document...',
  confidence: 0.85,
  metadata: {},
  created_at: '2024-03-20T10:00:00Z',
  processed_at: '2024-03-20T10:01:00Z',
  updated_at: '2024-03-20T10:01:00Z'
};

export const Default: Story = {
  args: {
    result: mockResult,
    onRetry: action('onRetry'),
    onDelete: action('onDelete')
  },
};

export const Processing: Story = {
  args: {
    result: {
      ...mockResult,
      status: OcrStatus.Processing,
      text: null,
      confidence: 0,
      processed_at: undefined,
      progress: 45
    },
    onRetry: action('onRetry'),
    onDelete: action('onDelete')
  },
};

export const Failed: Story = {
  args: {
    result: {
      ...mockResult,
      status: OcrStatus.Failed,
      text: null,
      confidence: 0,
      error: 'Failed to process document. Please try again.',
    },
    onRetry: action('onRetry'),
    onDelete: action('onDelete')
  },
};

export const LowConfidence: Story = {
  args: {
    result: {
      ...mockResult,
      confidence: 0.45,
      text: 'This text was extracted with low confidence due to poor image quality.',
    },
    onRetry: action('onRetry'),
    onDelete: action('onDelete')
  },
};

export const NoPreview: Story = {
  args: {
    result: {
      ...mockResult,
      file_path: '',
    },
    onRetry: action('onRetry'),
    onDelete: action('onDelete')
  },
}; 