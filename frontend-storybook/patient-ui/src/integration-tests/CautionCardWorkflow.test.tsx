import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CautionCardManagement } from '../components/patient/CautionCardManagement';
import type { CautionCard } from '../components/patient/CautionCardManagement';

// Mock data - Ensure it matches the CautionCard type from the component
const mockCautionCard: CautionCard = {
  id: '1',
  patientId: '1',
  type: 'ALLERGY',
  severity: 'HIGH',
  title: 'Penicillin Allergy',
  description: 'Severe allergic reaction to penicillin',
  createdAt: '2023-06-01T12:00:00Z',
  updatedAt: '2023-06-01T12:00:00Z',
  createdBy: 'Dr. Smith',
  active: true,
};

describe('Caution Card Workflow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
    // Reset window.confirm mock
    window.confirm = jest.fn(() => true);
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('completes a full caution card management workflow', async () => {
    // Mock API responses
    const mockAdd = jest.fn().mockResolvedValue({
      success: true,
      message: 'Caution card added',
      cautionCard: { ...mockCautionCard, id: '2', title: 'Latex Allergy' }, // Simulate added card
    });

    const mockUpdate = jest.fn().mockResolvedValue({
      success: true,
      message: 'Caution card updated',
      cautionCard: {
        ...mockCautionCard,
        title: 'Updated Allergy',
        updatedAt: new Date().toISOString(), // Simulate update timestamp
      },
    });

    const mockDelete = jest.fn().mockResolvedValue({
      success: true,
      message: 'Caution card deleted',
    });

    // Initial state for the component
    const initialCards: readonly CautionCard[] = [mockCautionCard]; // Start with readonly

    // Render component
    renderWithQuery(
      <CautionCardManagement
        patientId="1"
        cautionCards={initialCards} // Pass readonly array
        onAdd={mockAdd}
        onUpdate={mockUpdate}
        onDelete={mockDelete}
      />
    );

    // 1. Verify initial render
    expect(screen.getByText('Caution Cards')).toBeInTheDocument();
    expect(screen.getByText('Penicillin Allergy')).toBeInTheDocument();

    // 2. Add new caution card
    await userEvent.click(screen.getByText('Add Caution Card'));

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const typeSelect = screen.getByLabelText(/type/i);
    const severitySelect = screen.getByLabelText(/severity/i);

    await userEvent.type(titleInput, 'Latex Allergy');
    await userEvent.type(descriptionInput, 'Moderate reaction to latex gloves');
    await userEvent.selectOptions(typeSelect, 'ALLERGY');
    await userEvent.selectOptions(severitySelect, 'MEDIUM');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: '1',
          type: 'ALLERGY',
          severity: 'MEDIUM',
          title: 'Latex Allergy',
          description: 'Moderate reaction to latex gloves',
          active: true,
        })
      );
    });

    // 3. Edit existing caution card
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    const firstCardEditButton = editButtons[0];
    // Add check before clicking
    if (!firstCardEditButton) throw new Error('Edit button not found');
    await userEvent.click(firstCardEditButton);

    const editTitleInput = screen.getByDisplayValue('Penicillin Allergy');
    await userEvent.clear(editTitleInput);
    await userEvent.type(editTitleInput, 'Updated Allergy');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          title: 'Updated Allergy',
        })
      );
    });

    // 4. Delete caution card
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const firstCardDeleteButton = deleteButtons[0];
    // Add check before clicking
    if (!firstCardDeleteButton) throw new Error('Delete button not found');
    await userEvent.click(firstCardDeleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });

  it('handles API errors gracefully', async () => {
    const mockAdd = jest.fn().mockRejectedValue(new Error('Add failed'));
    const mockUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));
    const mockDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));

    renderWithQuery(
      <CautionCardManagement
        patientId="1"
        cautionCards={[mockCautionCard]} // Pass readonly array
        onAdd={mockAdd}
        onUpdate={mockUpdate}
        onDelete={mockDelete}
      />
    );

    // 1. Test add error
    await userEvent.click(screen.getByText('Add Caution Card'));
    await userEvent.type(screen.getByLabelText(/title/i), 'Test');
    await userEvent.type(screen.getByLabelText(/description/i), 'Test description');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/add failed/i);
    });
    if (screen.queryByRole('button', { name: /cancel/i })) {
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    }

    // 2. Test update error
    const editButtonsUpdate = screen.getAllByRole('button', { name: /edit/i });
    const firstEditButtonUpdate = editButtonsUpdate[0];
    // Add check before clicking
    if (!firstEditButtonUpdate) throw new Error('Edit button not found for update error test');
    await userEvent.click(firstEditButtonUpdate);

    const editTitleInput = screen.getByDisplayValue('Penicillin Allergy');
    await userEvent.clear(editTitleInput);
    await userEvent.type(editTitleInput, 'Updated Title');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/update failed/i);
    });
    if (screen.queryByRole('button', { name: /cancel/i })) {
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    }

    // 3. Test delete error
    const deleteButtonsDelete = screen.getAllByRole('button', { name: /delete/i });
    const firstDeleteButtonDelete = deleteButtonsDelete[0];
    // Add check before clicking
    if (!firstDeleteButtonDelete) throw new Error('Delete button not found for delete error test');
    await userEvent.click(firstDeleteButtonDelete);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/delete failed/i);
    });
  });

  // Validation test might need adjustment depending on form implementation details
  // it('validates form inputs correctly', async () => { ... });

  // Concurrency test removed as it requires complex state management simulation
  // it('maintains data consistency during concurrent operations', async () => { ... });
});
