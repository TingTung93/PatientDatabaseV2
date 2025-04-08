import React, { useState } from 'react';
import { CautionCard } from '../../types/cautionCard';
import { CautionCard as CautionCardComponent } from './CautionCard';

interface OrphanedCautionCardsProps {
  cards: CautionCard[];
  onReview?: (
    cardId: number,
    reviewedBy: string
  ) => Promise<{ success: boolean; message: string; card: CautionCard }>;
  onLink?: (
    cardId: number,
    patientId: number
  ) => Promise<{ success: boolean; message: string; card: CautionCard }>;
  onDelete?: (cardId: number) => Promise<{ success: boolean; message: string }>;
  filters?: {
    reviewed?: boolean;
    unreviewed?: boolean;
    bloodType?: string;
  };
  onSearch?: (query: string) => CautionCard[];
}

export const OrphanedCautionCards: React.FC<OrphanedCautionCardsProps> = ({
  cards,
  onReview,
  onLink,
  onDelete,
  filters,
  onSearch,
}): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCards, setFilteredCards] = useState<CautionCard[]>(cards);

  // Apply filters and search
  React.useEffect(() => {
    let result = [...cards];

    // Apply status filters
    if (filters?.reviewed) {
      result = result.filter(card => card.status === 'reviewed');
    }
    if (filters?.unreviewed) {
      result = result.filter(card => card.status === 'pending');
    }

    // Apply blood type filter
    if (filters?.bloodType) {
      result = result.filter(card => card.blood_type === filters.bloodType);
    }

    // Apply search if query exists
    if (searchQuery && onSearch) {
      result = onSearch(searchQuery);
    }

    setFilteredCards(result);
  }, [cards, filters, searchQuery, onSearch]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(event.target.value);
  };

  const handleReview = (card: CautionCard): void => {
    if (onReview) {
      void onReview(card.id, 'current-user');
    }
  };

  const handleLink = (card: CautionCard): void => {
    if (onLink) {
      void onLink(card.id, 0);
    }
  };

  return (
    <div className="orphaned-caution-cards">
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by file name, blood type, or antibodies..."
          className="search-input"
        />
      </div>

      <div className="cards-grid">
        {filteredCards.map(card => {
          const cardProps = {
            card,
            ...(onReview && { onReview: handleReview }),
            ...(onLink && { onLink: handleLink }),
          };
          return <CautionCardComponent key={card.id} {...cardProps} />;
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="no-results">
          <p>No orphaned caution cards found.</p>
        </div>
      )}
    </div>
  );
};
