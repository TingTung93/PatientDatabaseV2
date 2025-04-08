import type { Meta, StoryObj } from '@storybook/react';
import { CautionCardEditModal } from '../../components/caution-cards/CautionCardEditModal';
import type { CautionCard } from '../../types/cautionCard';

const meta: Meta<typeof CautionCardEditModal> = {
  title: 'Components/CautionCards/CautionCardEditModal',
  component: CautionCardEditModal,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CautionCardEditModal>;

const mockCard: CautionCard = {
  id: 1,
  file_name: 'card1.pdf',
  file_path: '/cards/card1.pdf',
  file_size: 1024,
  file_type: 'application/pdf',
  blood_type: 'A+',
  antibodies: ['Anti-K', 'Anti-D', 'Anti-E'],
  transfusion_requirements: ['Washed', 'Irradiated'],
  ocr_text: 'Sample OCR text from the caution card image',
  metadata: {},
  status: 'pending',
  created_at: '2024-03-20T10:00:00Z',
  updated_at: '2024-03-20T10:00:00Z'
};

export const Default: Story = {
  args: {
    visible: true,
    cautionCard: mockCard,
    onClose: () => console.log('Modal closed'),
    onUpdate: async (data) => {
      console.log('Update data:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

export const WithSubmitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true
  }
};

export const WithComplexData: Story = {
  args: {
    visible: true,
    cautionCard: {
      ...mockCard,
      antibodies: ['Anti-K', 'Anti-D', 'Anti-E', 'Anti-c', 'Anti-M', 'Anti-Fya'],
      transfusion_requirements: ['Washed', 'Irradiated', 'Leukoreduced', 'CMV-Negative', 'HLA-matched'],
      ocr_text: 'This is a very long OCR text that contains detailed information about the patient\'s transfusion history and specific requirements. Multiple antibodies have been identified over time through various cross-matching procedures.'
    },
    onClose: () => console.log('Modal closed'),
    onUpdate: async (data) => {
      console.log('Update data:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}; 