import { Meta, StoryObj } from '@storybook/react';
import { OrphanedCautionCards } from '../../components/caution-cards/OrphanedCautionCards';
import { mockCautionCards as baseMockCards } from '../../mocks/cautionCardMocks';
import { CautionCard } from '../../types/cautionCard';

// Ensure mock data conforms to CautionCard type
const mockOrphanedCards: CautionCard[] = baseMockCards
  .filter((card: any) => !card.patient_id)
  .map((card: any, index: number) => ({
    ...card,
    id: card.id || 1000 + index,
    file_name: card.file_name || `Orphaned_Doc_${index + 1}.pdf`,
    file_path: card.file_path || `/path/to/orphaned_${index + 1}.pdf`,
    file_size: card.file_size || 512 * (index + 1),
    file_type: card.file_type || 'application/pdf',
    ocr_text: card.ocr_text || `Orphaned OCR text ${index + 1}`,
    metadata: card.metadata || { source: 'unknown' },
    created_at: card.created_at || new Date().toISOString(),
    updated_at: card.updated_at || new Date().toISOString(),
    status: card.status || 'pending',
    blood_type: card.blood_type || 'Unknown',
    antibodies: card.antibodies || [],
    transfusion_requirements: card.transfusion_requirements || [],
    patient_id: 0,
  })) as CautionCard[];

const meta: Meta<typeof OrphanedCautionCards> = {
  title: 'Caution Cards/OrphanedCautionCards',
  component: OrphanedCautionCards,
  tags: ['autodocs'],
  argTypes: {
    cards: { control: 'object' },
    onReview: { action: 'reviewed' },
    onLink: { action: 'linked' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof OrphanedCautionCards>;

export const Default: Story = {
  args: {
    cards: mockOrphanedCards,
    onReview: async (
      cardId: number,
      reviewedBy: string
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Reviewing card:', { cardId, reviewedBy });
      await new Promise(resolve => setTimeout(resolve, 500));
      const reviewedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!reviewedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...reviewedCard,
        status: 'reviewed',
        reviewed_by: reviewedBy,
        reviewed_date: new Date().toISOString(),
      };
      return {
        success: true,
        message: 'Card reviewed successfully',
        card: updatedCard,
      };
    },
    onLink: async (
      cardId: number,
      patientId: number
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Linking card to patient:', { cardId, patientId });
      await new Promise(resolve => setTimeout(resolve, 500));
      const linkedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!linkedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...linkedCard,
        patient_id: patientId,
      };
      return {
        success: true,
        message: 'Card linked successfully',
        card: updatedCard,
      };
    },
  },
};

export const WithFilters: Story = {
  args: {
    cards: mockOrphanedCards,
    filters: {
      reviewed: false,
      unreviewed: true,
      bloodType: 'AB+',
    },
    onReview: async (
      cardId: number,
      reviewedBy: string
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Reviewing card:', { cardId, reviewedBy });
      await new Promise(resolve => setTimeout(resolve, 500));
      const reviewedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!reviewedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...reviewedCard,
        status: 'reviewed',
        reviewed_by: reviewedBy,
        reviewed_date: new Date().toISOString(),
      };
      return {
        success: true,
        message: 'Card reviewed successfully',
        card: updatedCard,
      };
    },
    onLink: async (
      cardId: number,
      patientId: number
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Linking card to patient:', { cardId, patientId });
      await new Promise(resolve => setTimeout(resolve, 500));
      const linkedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!linkedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...linkedCard,
        patient_id: patientId,
      };
      return {
        success: true,
        message: 'Card linked successfully',
        card: updatedCard,
      };
    },
  },
};

export const WithSearch: Story = {
  args: {
    cards: mockOrphanedCards,
    onSearch: (query: string) => {
      return mockOrphanedCards.filter(
        card =>
          card.file_name.toLowerCase().includes(query.toLowerCase()) ||
          (card.blood_type?.toLowerCase() || '').includes(query.toLowerCase()) ||
          card.antibodies.some(antibody => antibody.toLowerCase().includes(query.toLowerCase()))
      );
    },
    onReview: async (
      cardId: number,
      reviewedBy: string
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Reviewing card:', { cardId, reviewedBy });
      await new Promise(resolve => setTimeout(resolve, 500));
      const reviewedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!reviewedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...reviewedCard,
        status: 'reviewed',
        reviewed_by: reviewedBy,
        reviewed_date: new Date().toISOString(),
      };
      return {
        success: true,
        message: 'Card reviewed successfully',
        card: updatedCard,
      };
    },
    onLink: async (
      cardId: number,
      patientId: number
    ): Promise<{ success: boolean; message: string; card: CautionCard }> => {
      console.log('Linking card to patient:', { cardId, patientId });
      await new Promise(resolve => setTimeout(resolve, 500));
      const linkedCard = mockOrphanedCards.find(c => c.id === cardId);
      if (!linkedCard) throw new Error('Card not found');
      const updatedCard: CautionCard = {
        ...linkedCard,
        patient_id: patientId,
      };
      return {
        success: true,
        message: 'Card linked successfully',
        card: updatedCard,
      };
    },
  },
};

export const Loading: Story = {
  args: {
    cards: [],
    // Simulate loading state if the component supports it, otherwise just show empty
  },
  parameters: {
    // You might need a way to pass a loading prop if the component has one
  },
};

export const Empty: Story = {
  args: {
    cards: [],
    // Pass dummy actions
    onReview: async () => ({ success: false, message: 'No card', card: {} as CautionCard }),
    onLink: async () => ({ success: false, message: 'No card', card: {} as CautionCard }),
    onDelete: async () => ({ success: false, message: 'No card' }),
  },
};
