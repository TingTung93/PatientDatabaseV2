import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  usePatientCautionCards,
  useDeleteCautionCard,
  useMarkCautionCardAsReviewed, // Correct hook name
} from '../../hooks/useCautionCards';
import { ConfirmationModal } from '../common/ConfirmationModal'; // Direct import
import { LoadingSpinner } from '../common/LoadingSpinner'; // Direct import
import { FallbackError } from '../common/FallbackError'; // Correct component name?
import { AuthContext } from '../../context/AuthContext'; // Import AuthContext
import { useContext } from 'react'; // Import useContext

interface PatientCautionCardListProps {
  patientId: string;
}

export const PatientCautionCardList: React.FC<PatientCautionCardListProps> = ({ patientId }) => {
  const [cardToDelete, setCardToDelete] = useState<number | null>(null); // Use number type
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const authContext = useContext(AuthContext); // Get auth context
  const currentUser = authContext?.user; // Get user

  const { data: cards, isLoading, error, refetch } = usePatientCautionCards(patientId);
  const deleteCardMutation = useDeleteCautionCard();
  const reviewCardMutation = useMarkCautionCardAsReviewed(); // Correct hook usage

  const handleDeleteClick = (cardId: number) => {
    // Accept number
    setCardToDelete(cardId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    // Ensure cardToDelete is a number and user exists
    if (typeof cardToDelete === 'number' && currentUser?.username) {
      deleteCardMutation.mutate(
        // Pass correct payload structure
        { id: cardToDelete, data: { updatedBy: currentUser.username } },
        {
          onSuccess: () => {
            setShowDeleteModal(false);
            setCardToDelete(null);
            refetch();
          },
        }
      );
    }
  };

  const handleReviewClick = (cardId: number) => {
    // Accept number
    // Ensure user exists
    if (currentUser?.username) {
      reviewCardMutation.mutate(
        // Pass correct payload structure and field name
        { id: cardId, data: { reviewedBy: currentUser.username } },
        {
          // Options object is the second argument
          onSuccess: () => refetch(),
          onError: err => {
            // Add basic error handling
            console.error('Failed to mark card as reviewed:', err);
          },
        } // End of options object
      ); // End of mutate call
    } else {
      console.error('Cannot review card: user not logged in.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <FallbackError error={error as Error} resetErrorBoundary={refetch} />; // Pass error and reset
  }

  if (!cards || cards.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">No caution cards linked to this patient.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Linked Caution Cards
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID/File</TableCell>
                  <TableCell>Blood Type</TableCell>
                  <TableCell>Antibodies</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reviewed</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.map(card => (
                  <TableRow key={card.id}>
                    <TableCell>{card.file_name || card.id}</TableCell>
                    <TableCell>{card.blood_type || 'N/A'}</TableCell>
                    <TableCell>{card.antibodies?.join(', ') || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={card.status}
                        // Correct color logic based on type
                        color={card.status === 'reviewed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        // Use status for label and color
                        label={card.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                        color={card.status === 'reviewed' ? 'success' : 'warning'}
                        size="small"
                      />
                      {card.reviewed_by && (
                        <Typography variant="caption" display="block">
                          by {card.reviewed_by}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        component={Link}
                        // Convert id to string for URL
                        to={`/caution-cards/${String(card.id)}`}
                        title="View card"
                        size="small"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleReviewClick(card.id)} // Pass number ID
                        // Use status and isPending
                        disabled={card.status === 'reviewed' || reviewCardMutation.isPending}
                        title="Mark as reviewed"
                        size="small"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteClick(card.id)} // Pass number ID
                        disabled={deleteCardMutation.isPending} // Use isPending
                        title="Delete card"
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)} // Correct prop name
        onConfirm={handleDeleteConfirm}
        title="Delete Caution Card"
        message="Are you sure you want to delete this caution card? This action cannot be undone."
        confirmText="Delete" // Correct prop name
        isConfirming={deleteCardMutation.isPending} // Correct prop name
      />
    </Box>
  );
};
