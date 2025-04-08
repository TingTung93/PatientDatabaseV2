import type { Meta, StoryObj } from '@storybook/react';
import { CautionCardUpload } from '../components/caution-cards/CautionCardUpload';

const meta: Meta<typeof CautionCardUpload> = {
  title: 'Patient/Upload/CautionCard',
  component: CautionCardUpload,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Stories demonstrating caution card file upload and processing',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CautionCardUpload>;

// Story demonstrating basic file upload
export const SimpleUpload: Story = {
  args: {
    patientId: 'patient-123', // Add the required patientId prop
  },
};

// Story demonstrating upload with validation
export const WithValidation: Story = {
  args: {
    patientId: 'patient-456', // Add the required patientId prop
    // Note: Validation logic is now internal to the component
  },
};

// Story demonstrating upload error handling
export const WithError: Story = {
  args: {
    patientId: 'patient-789', // Add the required patientId prop
    // Note: Error handling is now internal; this story might need rethinking
    // depending on how errors are surfaced or if specific error states can be triggered via props.
    // For now, it will just render the component.
  },
};

// Story demonstrating loading state
export const WithLoading: Story = {
  args: {
    patientId: 'patient-000', // Add the required patientId prop
    // Note: Loading state is internal; this story might need rethinking
    // to demonstrate the loading state, perhaps by mocking the upload service
    // or finding another way to trigger the internal loading state if possible.
    // For now, it will just render the component.
  },
};
