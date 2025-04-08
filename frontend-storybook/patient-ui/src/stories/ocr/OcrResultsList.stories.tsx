import type { Meta, StoryObj } from '@storybook/react';
import { OcrResultsList } from '../../components/ocr/OcrResultsList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const meta = {
  title: 'Components/OCR/OcrResultsList',
  component: OcrResultsList,
  parameters: {
    docs: {
      description: {
        component: 'OCR Results List component that connects to the real backend at http://localhost:5000/api. Make sure the backend server is running.',
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
} satisfies Meta<typeof OcrResultsList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story using real backend
export const Default: Story = {};

// Note: Other stories (Loading, Empty, Error) have been removed as they relied on mocked data.
// The component will now show real states based on the backend's response. 