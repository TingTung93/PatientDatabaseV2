import type { Meta, StoryObj } from '@storybook/react';
import { OcrUpload } from '../../components/ocr/OcrUpload';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const meta = {
  title: 'Components/OCR/OcrUpload',
  component: OcrUpload,
  parameters: {
    docs: {
      description: {
        component: 'OCR Upload component that connects to the real backend at http://localhost:5000/api. Make sure the backend server is running.',
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof OcrUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story using real backend
export const Default: Story = {};

// Note: Other stories (Loading, Error) have been removed as they relied on mocked data.
// The component will now show real states based on the backend's response. 