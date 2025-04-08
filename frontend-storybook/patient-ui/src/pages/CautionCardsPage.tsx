import React, { useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom'; // Import useParams
import {
  useCautionCards,
  useOrphanedCautionCards,
  useDeleteCautionCard,
  useLinkCautionCardToPatient, // Corrected hook name
  useMarkCautionCardAsReviewed,
  useProcessCautionCard, // Keep for upload modal if implemented separately
} from '../hooks/useCautionCards';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { AuthContext } from '../context/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { FallbackError } from '../components/common/FallbackError'; // Corrected import
import { LinkCardModal } from '../components/caution-cards/LinkCardModal';
import { formatDate } from '../utils/dateUtils';
import { CautionCardUpload } from '../components/caution-cards/CautionCardUpload'; // Import the upload component
import { CautionCard } from '../types/cautionCard';
import { PaginatedResponse } from '../types/common';

export const CautionCardsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [cardToLink, setCardToLink] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({ view: 'all' });
  const itemsPerPage = 15;
  const authContext = useContext(AuthContext); // Get context value
  const user = authContext?.user; // Safely access user
  const { patientId } = useParams<{ patientId: string }>(); // Get patientId from route params

  // Choose hook based on filter
  const isOrphanedView = filters['view'] === 'orphaned'; // Use bracket notation

  // Correct hook usage
  const allCardsQuery = useCautionCards({ page, limit: itemsPerPage, ...filters }); // Pass args as object
  const orphanedCardsQuery = useOrphanedCautionCards(); // No args expected

  // Determine which data/state to use
  const queryResult = isOrphanedView ? orphanedCardsQuery : allCardsQuery;
  const { data, isLoading, error, refetch } = queryResult as {
    data: PaginatedResponse<CautionCard> | CautionCard[] | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };

  const deleteCardMutation = useDeleteCautionCard();
  const reviewCardMutation = useMarkCautionCardAsReviewed();
  const linkCardMutation = useLinkCautionCardToPatient(); // Corrected hook name

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // --- Delete Modal Logic ---
  const openDeleteConfirmation = (cardId: number) => {
    setCardToDelete(cardId);
    setShowDeleteModal(true);
  };
  const closeDeleteConfirmation = () => {
    setCardToDelete(null);
    setShowDeleteModal(false);
  };
  const confirmDelete = () => {
    // Ensure user and cardToDelete exist before mutating
    if (cardToDelete !== null && user?.username) {
      deleteCardMutation.mutate(
        { id: cardToDelete, data: { updatedBy: user.username } }, // Pass number ID directly
        {
          onSuccess: () => {
            closeDeleteConfirmation();
            refetch();
            console.log('Card deleted');
          },
          onError: (err: Error) => {
            // Add type
            closeDeleteConfirmation();
            console.error('Delete failed:', err);
          },
        }
      );
    } else {
      console.error('Cannot delete: Card ID or Username missing.');
      closeDeleteConfirmation();
    }
  };

  // --- Link Modal Logic ---
  const openLinkConfirmation = (cardId: number) => {
    setCardToLink(cardId);
    setShowLinkModal(true);
  };
  // Passed to LinkCardModal's onConfirm prop
  const handleLinkConfirm = (patientId: string) => {
    // Modal provides string ID
    // Ensure user and cardToLink exist
    if (cardToLink !== null && user?.username) {
      linkCardMutation.mutate(
        { id: cardToLink, data: { patientId: patientId, updatedBy: user.username } }, // Pass number ID directly
        {
          onSuccess: () => {
            setShowLinkModal(false);
            setCardToLink(null);
            refetch();
            console.log(`Card ${cardToLink} linked to patient ${patientId}`);
          },
          onError: (err: Error) => {
            // Add type
            setShowLinkModal(false);
            setCardToLink(null);
            console.error('Link failed:', err);
          },
        }
      );
    } else {
      console.error('Cannot link: Card ID, Patient ID or Username missing.');
      setShowLinkModal(false);
      setCardToLink(null);
    }
  };

  const handleReviewClick = (cardId: number) => {
    // Ensure user exists
    if (user?.username) {
      reviewCardMutation.mutate(
        { id: cardId, data: { reviewedBy: user.username } }, // Pass number ID directly
        {
          onSuccess: () => refetch(),
          onError: (err: Error) => {
            // Add type
            console.error('Review failed:', err);
          },
        }
      );
    } else {
      console.error('Cannot review: Username missing.');
    }
  };

  // Data extraction
  const cards: readonly CautionCard[] = Array.isArray(data)
    ? data
    : (data as PaginatedResponse<CautionCard>)?.data || [];

  const totalItems = Array.isArray(data)
    ? data.length
    : (data as PaginatedResponse<CautionCard>)?.total || 0;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (isLoading) {
    return <LoadingSpinner message="Loading caution cards..." />;
  }

  if (error) {
    // Use FallbackError
    return <FallbackError error={error} resetErrorBoundary={refetch} />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Caution Cards
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {/* TODO: Implement FilterBar */}
        <div>{/* Placeholder for filters */}</div>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/caution-cards/upload"
        >
          Upload Caution Cards
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID/File</TableCell>
                  <TableCell>Blood Type</TableCell>
                  <TableCell>Antibodies</TableCell>
                  <TableCell>Link Status</TableCell>
                  <TableCell>Review Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No caution cards found.
                    </TableCell>
                  </TableRow>
                ) : (
                  cards.map((card: CautionCard) => (
                    <TableRow key={card.id}>
                      <TableCell>{card.file_name || card.id}</TableCell>
                      <TableCell>{card.blood_type || 'N/A'}</TableCell>
                      <TableCell>{card.antibodies?.join(', ') || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={card.patient_id ? 'Linked' : 'Unlinked'}
                          color={card.patient_id ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={card.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                          color={card.status === 'reviewed' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleReviewClick(card.id)}
                          disabled={
                            card.status === 'reviewed' ||
                            (reviewCardMutation.isPending &&
                              String(reviewCardMutation.variables?.id) === String(card.id))
                          } // Compare as strings
                          title="Mark as reviewed"
                          size="small"
                        >
                          {reviewCardMutation.isPending &&
                          String(reviewCardMutation.variables?.id) === String(card.id) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <CheckCircleIcon />
                          )}
                        </IconButton>
                        {!card.patient_id && (
                          <IconButton
                            onClick={() => openLinkConfirmation(card.id)}
                            disabled={
                              linkCardMutation.isPending &&
                              String(linkCardMutation.variables?.id) === String(card.id) // Use variables.id
                            } // Compare as strings
                            title="Link to patient"
                            size="small"
                          >
                            {linkCardMutation.isPending &&
                            String(linkCardMutation.variables?.id) === String(card.id) ? ( // Use variables.id
                              <CircularProgress size={20} />
                            ) : (
                              <LinkIcon />
                            )}
                          </IconButton>
                        )}
                        <IconButton
                          onClick={() => openDeleteConfirmation(card.id)}
                          disabled={
                            deleteCardMutation.isPending &&
                            String(deleteCardMutation.variables?.id) === String(card.id)
                          } // Compare as strings
                          title="Delete card"
                          size="small"
                        >
                          {deleteCardMutation.isPending &&
                          String(deleteCardMutation.variables?.id) === String(card.id) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DeleteIcon />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalItems > 0 && totalPages > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onCancel={closeDeleteConfirmation} // Correct prop name
        onConfirm={confirmDelete}
        title="Delete Caution Card"
        message={`Are you sure you want to delete caution card ID ${cardToDelete}? This action cannot be undone.`}
        confirmText="Delete" // Correct prop name
        isConfirming={deleteCardMutation.isPending} // Correct prop name
      />

      <LinkCardModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onConfirm={handleLinkConfirm} // Correct prop name
        // cardId prop might not be needed if modal handles its own state
        isLoading={linkCardMutation.isPending} // Correct prop name
      />
    </Box>
  );
};

export default CautionCardsPage;
