import { Meta, StoryObj } from '@storybook/react';
import { CautionCardBatch } from '../../components/caution-cards/CautionCardBatch';
import { mockCautionCards as baseMockCards } from '../../mocks/cautionCardMocks'; // Use correct export name
import { CautionCard } from '../../types/cautionCard';

// Ensure mock data conforms to CautionCard type
const mockCards: CautionCard[] = baseMockCards.slice(0, 3).map((card: any, index: number) => ({
  // Add types
  ...card,
  id: index + 1, // Ensure unique ID
  // Add any missing required fields if baseMockCards is incomplete
  file_name: card.file_name || `Document_${index + 1}.pdf`,
  file_path: card.file_path || `/path/to/document_${index + 1}.pdf`,
  file_size: card.file_size || 1024 * (index + 1),
  file_type: card.file_type || 'application/pdf',
  ocr_text: card.ocr_text || `OCR text for card ${index + 1}`,
  metadata: card.metadata || { source: 'test' },
  created_at: card.created_at || new Date().toISOString(),
  updated_at: card.updated_at || new Date().toISOString(),
  status: card.status || 'pending', // Ensure valid status
  blood_type: card.blood_type || 'O+', // Ensure required
  antibodies: card.antibodies || [], // Ensure required
  transfusion_requirements: card.transfusion_requirements || [], // Ensure required
})) as CautionCard[];

const meta: Meta<typeof CautionCardBatch> = {
  title: 'Caution Cards/CautionCardBatch',
  component: CautionCardBatch,
  tags: ['autodocs'],
  argTypes: {
    selectedCards: { control: 'object' },
    currentUser: { control: 'text' },
    onCancel: { action: 'cancelled' },
    onSuccess: { action: 'batchSuccess' },
    // onError: { action: 'batchError' }, // Remove onError as it doesn't seem to exist on the component
  },
};

export default meta;
type Story = StoryObj<typeof CautionCardBatch>;

export const Default: Story = {
  args: {
    selectedCards: mockCards,
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Batch operation successful'),
    // onError: (error: Error) => console.error('Batch error:', error), // Remove onError
  },
};

export const SingleCard: Story = {
  args: {
    selectedCards: mockCards[0] ? [mockCards[0]] : [], // Add check for undefined
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Batch operation successful'),
    // onError: (error: Error) => console.error('Batch error:', error), // Remove onError
  },
};

export const ManyCards: Story = {
  args: {
    selectedCards: Array.from({ length: 10 }, (_, i) => ({
      ...mockCards[i % mockCards.length], // Use modulo for safety
      id: i + 1, // Ensure unique IDs
    })) as CautionCard[],
    currentUser: 'jane.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Batch operation successful'),
    // onError: (error: Error) => console.error('Batch error:', error), // Remove onError
  },
};

export const EmptySelection: Story = {
  args: {
    selectedCards: [],
    currentUser: 'john.doe',
    onCancel: () => console.log('Cancel clicked'),
    onSuccess: () => console.log('Should not succeed with empty selection'),
    // onError: (error: Error) => console.error('Batch error:', error), // Remove onError
  },
};
