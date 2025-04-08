import type { Meta, StoryObj } from '@storybook/react';
import { CautionCardUpload } from '../components/patient/CautionCardUpload';
import { cautionCardApi } from '../api/endpoints/cautionCardApi';

// Mock API responses
const mockApiResponse = {
  success: true,
  message: 'Operation successful',
  cardId: '123'
};

// Mock the API calls
jest.mock('../api/endpoints/cautionCardApi', () => ({
  cautionCardApi: {
    uploadCautionCardFile: jest.fn(() => Promise.resolve({ data: mockApiResponse })),
  },
}));

const meta: Meta<typeof CautionCardUpload> = {
  title: 'Patient/Management/CautionCard/API',
  component: CautionCardUpload,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Stories demonstrating caution card management with API integration',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CautionCardUpload>;

// Story demonstrating basic upload functionality with API
export const WithApiIntegration: Story = {
  args: {
    onUpload: async (file: File) => {
      try {
        const response = await cautionCardApi.uploadCautionCardFile({
          file,
        });
        console.log('Upload successful:', response.data);
        return {
          success: response.data.success,
          message: response.data.message,
          cardId: Number(response.data.cardId),
        };
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    },
  },
};

// Story demonstrating loading state
export const WithApiLoading: Story = {
  args: {
    isLoading: true,
  },
};

// Story demonstrating custom file size limit
export const WithCustomSizeLimit: Story = {
  args: {
    maxFileSize: 2 * 1024 * 1024, // 2MB limit
    onUpload: async (file: File) => {
      const response = await cautionCardApi.uploadCautionCardFile({
        file,
      });
      return {
        success: response.data.success,
        message: response.data.message,
        cardId: Number(response.data.cardId),
      };
    },
  },
};

// Story demonstrating custom accepted file types
export const WithCustomFileTypes: Story = {
  args: {
    acceptedFileTypes: ['.pdf', '.jpg'],
    onUpload: async (file: File) => {
      const response = await cautionCardApi.uploadCautionCardFile({
        file,
      });
      return {
        success: response.data.success,
        message: response.data.message,
        cardId: Number(response.data.cardId),
      };
    },
  },
};

// Story demonstrating error handling
export const WithApiError: Story = {
  args: {
    onUpload: async () => {
      throw new Error('Failed to upload file');
    },
  },
}; 