import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cautionCardService, type CautionCard, type CautionCardSearchParams } from '../../services/cautionCardService';
import { websocketService } from '../../services/websocketService';

interface CautionCardListProps {
  patientId?: number;
  onCardSelect?: (card: CautionCard) => void;
}

export const CautionCardList: React.FC<CautionCardListProps> = ({ patientId, onCardSelect }) => {
  const [searchParams, setSearchParams] = useState<CautionCardSearchParams>({
    page: 1,
    limit: 10,
    patientId,
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['cautionCards', searchParams],
    () => cautionCardService.getAllCautionCards(searchParams),
    {
      keepPreviousData: true,
    }
  );

  const markAsReviewedMutation = useMutation(
    ({ id, reviewedBy }: { id: number; reviewedBy: string }) =>
      cautionCardService.markAsReviewed(id, reviewedBy),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['cautionCards']);
      },
    }
  );

  const deleteMutation = useMutation(
    ({ id, updatedBy }: { id: number; updatedBy: string }) =>
      cautionCardService.deleteCautionCard(id, updatedBy),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['cautionCards']);
      },
    }
  );

  // Subscribe to WebSocket events
  React.useEffect(() => {
    websocketService.subscribe(['caution_card_created', 'caution_card_updated', 'caution_card_deleted']);

    const handleCardUpdate = () => {
      queryClient.invalidateQueries(['cautionCards']);
    };

    websocketService.on('caution_card_created', handleCardUpdate);
    websocketService.on('caution_card_updated', handleCardUpdate);
    websocketService.on('caution_card_deleted', handleCardUpdate);

    return () => {
      websocketService.unsubscribe(['caution_card_created', 'caution_card_updated', 'caution_card_deleted']);
      websocketService.off('caution_card_created', handleCardUpdate);
      websocketService.off('caution_card_updated', handleCardUpdate);
      websocketService.off('caution_card_deleted', handleCardUpdate);
    };
  }, [queryClient]);

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
  };

  const handleMarkAsReviewed = (id: number) => {
    markAsReviewedMutation.mutate({ id, reviewedBy: 'current-user' }); // Replace with actual user ID
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this caution card?')) {
      deleteMutation.mutate({ id, updatedBy: 'current-user' }); // Replace with actual user ID
    }
  };

  if (isLoading) return <div>Loading caution cards...</div>;
  if (error) return <div>Error loading caution cards: {(error as Error).message}</div>;

  return (
    <div className="caution-cards-list">
      <h2>Caution Cards</h2>
      
      <div className="caution-cards-grid">
        {data?.data.map(card => (
          <div key={card.id} className="caution-card">
            <img 
              src={card.file_path} 
              alt={`Caution card ${card.id}`}
              onClick={() => onCardSelect?.(card)}
            />
            <div className="card-details">
              <p>Blood Type: {card.blood_type}</p>
              {card.antibodies.length > 0 && (
                <p>Antibodies: {card.antibodies.join(', ')}</p>
              )}
              {card.transfusion_requirements.length > 0 && (
                <p>Requirements: {card.transfusion_requirements.join(', ')}</p>
              )}
              <p>Status: {card.status}</p>
              {card.reviewed_by && (
                <p>Reviewed by: {card.reviewed_by}</p>
              )}
            </div>
            <div className="card-actions">
              {card.status !== 'reviewed' && (
                <button
                  onClick={() => handleMarkAsReviewed(card.id)}
                  disabled={markAsReviewedMutation.isLoading}
                >
                  Mark as Reviewed
                </button>
              )}
              <button
                onClick={() => handleDelete(card.id)}
                disabled={deleteMutation.isLoading}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(searchParams.page! - 1)}
            disabled={searchParams.page === 1}
          >
            Previous
          </button>
          <span>
            Page {searchParams.page} of {data.pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(searchParams.page! + 1)}
            disabled={searchParams.page === data.pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}; 