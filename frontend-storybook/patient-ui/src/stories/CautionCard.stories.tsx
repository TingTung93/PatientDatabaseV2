import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { CautionCard } from '../components/caution-cards/CautionCard';
import { CautionCard as CautionCardType } from '../types/cautionCard';

// Mock caution card data
const mockCautionCard: CautionCardType = {
  id: 1,
  file_name: 'caution_card_1.pdf',
  file_path: '/path/to/file1.pdf',
  file_size: 1024,
  file_type: 'application/pdf',
  blood_type: 'AB+',
  antibodies: ['Anti-K', 'Anti-D'],
  transfusion_requirements: ['Washed', 'Irradiated'],
  ocr_text: 'Card content...',
  metadata: {},
  status: 'pending',
  created_at: '2023-06-01T12:00:00Z',
  updated_at: '2023-06-01T12:00:00Z',
};

const meta: Meta<typeof CautionCard> = {
  title: 'CautionCards/CautionCard',
  component: CautionCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <Box sx={{ maxWidth: 400, margin: 'auto' }}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    card: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof CautionCard>;

export const Default: Story = {
  args: {
    card: mockCautionCard,
  },
};

export const Reviewed: Story = {
  args: {
    card: {
      ...mockCautionCard,
      status: 'reviewed',
      reviewed_by: 'Dr. Smith',
      reviewed_date: '2023-06-02T12:00:00Z',
    },
  },
};

export const Orphaned: Story = {
  args: {
    card: {
      ...mockCautionCard,
      patient_id: 0, // Use 0 for orphaned to satisfy type 'number'
    },
  },
};

export const MinimalData: Story = {
  args: {
    card: {
      // Create a minimal but valid card
      id: 2,
      file_name: 'minimal.txt',
      file_path: '/minimal.txt',
      file_size: 100,
      file_type: 'text/plain',
      ocr_text: 'Minimal text',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending',
      blood_type: 'O+', // Required, use placeholder
      antibodies: [], // Required
      transfusion_requirements: [], // Required
      // patient_id is optional, so omit for minimal
    } as CautionCardType,
  },
};

export const LongFileName: Story = {
  args: {
    card: {
      ...mockCautionCard,
      file_name:
        'this_is_a_very_very_long_file_name_that_might_cause_overflow_issues_in_the_ui_hopefully_not.pdf',
    },
  },
};

export const WithActions: Story = {
  args: {
    card: mockCautionCard,
    showActions: true,
  },
};

export const WithoutActions: Story = {
  args: {
    card: mockCautionCard,
    showActions: false,
  },
};
