import { Meta, StoryObj } from '@storybook/react';
import { CautionCardReview } from '../../components/caution-cards/CautionCardReview';
import { mockCautionCards } from '../../mocks/cautionCardMocks'; // Corrected import path and name
import { CautionCard } from '../../types/cautionCard';

// Use the first card from the imported array as the base
const baseMockCard = mockCautionCards[0] || ({} as Partial<CautionCard>); // Add fallback
// Ensure mock data conforms to CautionCard type
const mockCard: CautionCard = {
  ...baseMockCard,
  id: 1,
  file_name: baseMockCard.file_name || `Document_1.pdf`,
  file_path: baseMockCard.file_path || `/path/to/document_1.pdf`,
  file_size: baseMockCard.file_size || 1024,
  file_type: baseMockCard.file_type || 'application/pdf',
  ocr_text:
    baseMockCard.ocr_text ||
    'This is the OCR text extracted from the document. It contains patient information like Blood Type: A+ and Antibodies: Anti-K.',
  metadata: baseMockCard.metadata || { source: 'test' },
  created_at: baseMockCard.created_at || new Date().toISOString(),
  updated_at: baseMockCard.updated_at || new Date().toISOString(),
  status: 'pending',
  blood_type: baseMockCard.blood_type || 'A+',
  antibodies: baseMockCard.antibodies || ['Anti-K'],
  transfusion_requirements: baseMockCard.transfusion_requirements || ['Irradiated'],
} as CautionCard;

const meta: Meta<typeof CautionCardReview> = {
  title: 'Caution Cards/CautionCardReview',
  component: CautionCardReview,
  tags: ['autodocs'],
  argTypes: {
    card: { control: 'object' },
    currentUser: { control: 'text' },
    onCancel: { action: 'cancelled' },
    onSuccess: { action: 'reviewSuccess' },
    // onError: { action: 'reviewError' }, // Remove onError
  },
};

export default meta;
type Story = StoryObj<typeof CautionCardReview>;

export const Default: Story = {
  args: {
    card: mockCard,
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Review successful'), // Adjust signature
    // onError: (error: Error) => console.error('Review error:', error), // Remove onError
  },
};

export const WithoutOcrText: Story = {
  args: {
    card: { ...mockCard, ocr_text: '' }, // Set OCR text to empty string instead of undefined
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Review successful'), // Adjust signature
    // onError: (error: Error) => console.error('Review error:', error), // Remove onError
  },
};

export const MinimalCardData: Story = {
  args: {
    card: {
      ...mockCard,
      blood_type: 'Unknown', // Use a valid placeholder if required
      antibodies: [],
      transfusion_requirements: [],
      ocr_text: 'Minimal OCR content.',
    } as CautionCard,
    currentUser: 'jane.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Review successful'), // Adjust signature
    // onError: (error: Error) => console.error('Review error:', error), // Remove onError
  },
};

export const ComplexCard: Story = {
  args: {
    card: {
      ...mockCard,
      antibodies: ['Anti-K', 'Anti-D', 'Anti-E', 'Anti-c', 'Anti-M', 'Anti-Fya'],
      transfusion_requirements: [
        'Washed',
        'Irradiated',
        'Leukoreduced',
        'CMV Negative',
        'HLA-matched',
      ],
      ocr_text:
        "This is a very long OCR text that contains detailed information about the patient's transfusion history and specific requirements. Multiple antibodies have been identified over time through various cross-matching procedures.",
    },
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Review successful'),
    // onError removed
  },
};
