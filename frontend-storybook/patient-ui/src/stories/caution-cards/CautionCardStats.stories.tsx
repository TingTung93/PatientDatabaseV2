import { Meta, StoryObj } from '@storybook/react';
import { CautionCardStats } from '../../components/caution-cards/CautionCardStats';
import { CautionCard } from '../../types/cautionCard';

// Helper function to generate mock cards with required fields
const generateMockCards = (count: number): CautionCard[] => {
  const cards: CautionCard[] = [];
  const statuses: CautionCard['status'][] = ['pending', 'reviewed'];
  const bloodTypes = ['A+', 'O-', 'B+', 'AB+', 'A-', 'O+', 'B-', 'AB-'];

  for (let i = 0; i < count; i++) {
    cards.push({
      id: i + 1,
      file_name: `card_${i + 1}.pdf`,
      file_path: `/cards/card_${i + 1}.pdf`,
      file_size: 1024 * (i + 1),
      file_type: 'application/pdf',
      blood_type: bloodTypes[i % bloodTypes.length] || 'O+', // Add fallback
      antibodies: i % 5 === 0 ? ['Anti-K'] : [],
      transfusion_requirements: i % 3 === 0 ? ['Irradiated'] : [],
      ocr_text: `OCR text for card ${i + 1}`,
      metadata: { source: 'bulk_upload' },
      status: statuses[i % statuses.length] || 'pending', // Add fallback to satisfy TS
      patient_id: i % 10 === 0 ? 0 : 100 + (i % 10), // Use 0 for orphaned to satisfy type 'number'
      created_at: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return cards;
};

const meta: Meta<typeof CautionCardStats> = {
  title: 'Caution Cards/CautionCardStats',
  component: CautionCardStats,
  tags: ['autodocs'],
  argTypes: {
    cards: { control: 'object' },
    loading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CautionCardStats>;

export const Default: Story = {
  args: {
    cards: generateMockCards(50),
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    cards: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    cards: [],
    loading: false,
  },
};

export const WithManyCards: Story = {
  args: {
    cards: generateMockCards(200),
    loading: false,
  },
};

export const MostlyReviewed: Story = {
  args: {
    cards: generateMockCards(50).map((card, i) => ({
      ...card,
      status: i < 40 ? 'reviewed' : 'pending',
    })),
    loading: false,
  },
};
