import type { Meta, StoryObj } from '@storybook/react';
import { CautionCardImport } from '../../components/caution-cards/CautionCardImport';

const meta = {
  title: 'Caution Cards/Import',
  component: CautionCardImport,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Component for importing caution card data from various file formats.'
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CautionCardImport>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock import function
const mockImport = async (file: File) => {
  console.log('Importing file:', file.name);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
};

export const Default: Story = {
  args: {
    onImport: mockImport,
    loading: false,
  }
};

export const Loading: Story = {
  args: {
    onImport: mockImport,
    loading: true,
    progress: {
      total: 100,
      processed: 45,
      successful: 42,
      failed: 3
    }
  }
};

export const WithProgress: Story = {
  args: {
    onImport: mockImport,
    loading: false,
    progress: {
      total: 100,
      processed: 75,
      successful: 70,
      failed: 5
    }
  }
};

export const CustomFormats: Story = {
  args: {
    onImport: mockImport,
    loading: false,
    acceptedFormats: ['.csv', '.xlsx'] // Only allow CSV and Excel
  }
}; 