import type { Meta, StoryObj } from '@storybook/react';
import { OcrPage } from '../../pages/OcrPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const meta = {
  title: 'Pages/OcrPage',
  component: OcrPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'OCR Page component that connects to the real backend at http://localhost:5000/api. Make sure the backend server is running.',
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
} satisfies Meta<typeof OcrPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story using real backend
export const Default: Story = {};

// Note: Other stories (Loading, Empty, Error) have been removed as they relied on mocked data.
// The component will now show real states based on the backend's response. 