const AppError = require('../../errors/AppError');
const CautionCardRepository = require('../../repositories/CautionCardRepository');
const OrphanedCautionCardRepository = require('../../repositories/OrphanedCautionCardRepository');
const PatientRepository = require('../../repositories/PatientRepository');
const logger = require('../../utils/logger');
const WebSocketHandler = require('../../websocket/handler');
const OrphanedCardService = require('../OrphanedCardService');

// --- Mock Dependencies ---
jest.mock('../../repositories/OrphanedCautionCardRepository');
jest.mock('../../repositories/CautionCardRepository');
// Explicitly mock PatientRepository and its methods used by the service
const mockPatientRepositoryFindById = jest.fn();
jest.mock('../../repositories/PatientRepository', () => {
    return jest.fn().mockImplementation(() => ({
        findById: mockPatientRepositoryFindById,
        // Add other methods if OrphanedCardService uses them
    }));
});
jest.mock('../../websocket/handler');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('OrphanedCardService', () => {
  let orphanedCardServiceInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    OrphanedCautionCardRepository.findAndCountAll.mockReset();
    OrphanedCautionCardRepository.findById.mockReset();
    OrphanedCautionCardRepository.delete.mockReset();
    CautionCardRepository.update.mockReset();
    mockPatientRepositoryFindById.mockReset(); // Reset the specific mock function
    WebSocketHandler.emitOrphanListUpdated.mockReset();
    WebSocketHandler.emitCautionCardFinalized.mockReset();

    // Re-require the service to get a fresh instance if needed, or use the exported singleton
    orphanedCardServiceInstance = require('../OrphanedCardService');
  });

  // --- listOrphanedCards Tests ---
  describe('listOrphanedCards', () => {
    it('should call repository findAndCountAll with filters and return formatted results', async () => {
      const filters = { limit: 10, offset: 0 };
      const mockRepoResult = { count: 15, rows: [{ id: 'orphan1', originalCardId: 'card1' }] };
      OrphanedCautionCardRepository.findAndCountAll.mockResolvedValue(mockRepoResult);

      const result = await orphanedCardServiceInstance.listOrphanedCards(filters);

      expect(OrphanedCautionCardRepository.findAndCountAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        orphanedCards: mockRepoResult.rows,
        pagination: { totalItems: mockRepoResult.count },
      });
      expect(logger.debug).toHaveBeenCalledWith('Listing orphaned caution cards with filters:', filters);
    });

    it('should handle errors from the repository', async () => {
      const dbError = new Error('DB Error');
      OrphanedCautionCardRepository.findAndCountAll.mockRejectedValue(dbError);

      await expect(orphanedCardServiceInstance.listOrphanedCards({}))
        .rejects.toThrow('Failed to retrieve orphaned cards.'); // Assuming generic error message

      expect(logger.error).toHaveBeenCalledWith('Error listing orphaned cards:', dbError);
    });
  });

  // --- getOrphanedCardDetails Tests ---
  describe('getOrphanedCardDetails', () => {
    it('should retrieve details using repository findById', async () => {
        const orphanId = 'orphan-detail-id';
        const mockOrphanDetails = { id: orphanId, originalCardId: 'card-abc', reviewedData: {} };
        OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanDetails);

        const result = await orphanedCardServiceInstance.getOrphanedCardDetails(orphanId);

        expect(OrphanedCautionCardRepository.findById).toHaveBeenCalledWith(orphanId);
        expect(result).toEqual(mockOrphanDetails);
        expect(logger.debug).toHaveBeenCalledWith(`Fetching details for orphaned card ID: ${orphanId}`);
    });

    it('should throw AppError if card not found', async () => {
        const orphanId = 'not-found-id';
        OrphanedCautionCardRepository.findById.mockResolvedValue(null);

        await expect(orphanedCardServiceInstance.getOrphanedCardDetails(orphanId))
            .rejects.toThrow(new AppError(`OrphanedCautionCard with ID ${orphanId} not found.`, 404));

        expect(OrphanedCautionCardRepository.findById).toHaveBeenCalledWith(orphanId);
    });

     it('should handle errors from the repository', async () => {
        const orphanId = 'error-id';
        const dbError = new Error('DB Error');
        OrphanedCautionCardRepository.findById.mockRejectedValue(dbError);

        await expect(orphanedCardServiceInstance.getOrphanedCardDetails(orphanId))
            .rejects.toThrow('Failed to retrieve orphaned card details.'); // Assuming generic error message

        expect(logger.error).toHaveBeenCalledWith(`Error fetching details for orphaned card ${orphanId}:`, dbError);
    });
  });

  // --- linkOrphanedCard Tests ---
  describe('linkOrphanedCard', () => {
    const orphanId = 'orphan-to-link';
    const patientId = 'patient-123';
    const mockOrphanCard = { id: orphanId, originalCardId: 'card-xyz', reviewedData: { name: 'Test' } };
    const mockPatient = { id: patientId, name: 'Test Patient' };

    it('should successfully link an orphaned card to a patient', async () => {
            OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard);
            mockPatientRepositoryFindById.mockResolvedValue(mockPatient); // Use specific mock
            CautionCardRepository.update.mockResolvedValue([1]); // Simulate successful update
            OrphanedCautionCardRepository.delete.mockResolvedValue(1); // Simulate successful delete
    
            const result = await orphanedCardServiceInstance.linkOrphanedCard(orphanId, patientId);
    
            expect(OrphanedCautionCardRepository.findById).toHaveBeenCalledWith(orphanId);
            expect(mockPatientRepositoryFindById).toHaveBeenCalledWith(patientId); // Check specific mock
            expect(CautionCardRepository.update).toHaveBeenCalledWith(mockOrphanCard.originalCardId, {
                status: 'linked',
                linkedPatientId: patientId,
            // Ensure reviewedData is preserved if needed, or updated if logic requires
            // reviewedData: mockOrphanCard.reviewedData // Assuming reviewedData doesn't change on link
        });
        expect(OrphanedCautionCardRepository.delete).toHaveBeenCalledWith(orphanId);
        expect(WebSocketHandler.emitCautionCardFinalized).toHaveBeenCalledWith({
            cardId: mockOrphanCard.originalCardId,
            status: 'linked',
            linkedPatientId: patientId,
        });
        expect(WebSocketHandler.emitOrphanListUpdated).toHaveBeenCalledWith({
            type: 'removed',
            cardId: mockOrphanCard.originalCardId, // Use originalCardId for consistency? Check service logic
            orphanId: orphanId,
        });
        expect(result).toEqual({ success: true, message: `Orphaned card ${orphanId} linked to patient ${patientId}.` });
        expect(logger.info).toHaveBeenCalledWith(`Linking orphaned card ${orphanId} (original: ${mockOrphanCard.originalCardId}) to patient ${patientId}`);
    });

    it('should throw AppError if orphaned card not found', async () => {
        OrphanedCautionCardRepository.findById.mockResolvedValue(null);

        await expect(orphanedCardServiceInstance.linkOrphanedCard(orphanId, patientId))
            .rejects.toThrow(new AppError(`OrphanedCautionCard with ID ${orphanId} not found.`, 404));

        expect(mockPatientRepositoryFindById).not.toHaveBeenCalled(); // Check specific mock
        expect(CautionCardRepository.update).not.toHaveBeenCalled();
        expect(OrphanedCautionCardRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AppError if patient not found', async () => {
            OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard);
            mockPatientRepositoryFindById.mockResolvedValue(null); // Patient not found - Use specific mock
    
            await expect(orphanedCardServiceInstance.linkOrphanedCard(orphanId, patientId))
            .rejects.toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

        expect(CautionCardRepository.update).not.toHaveBeenCalled();
        expect(OrphanedCautionCardRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if updating original caution card fails', async () => {
            const updateError = new Error('Update Failed');
            OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard);
            mockPatientRepositoryFindById.mockResolvedValue(mockPatient); // Use specific mock
            CautionCardRepository.update.mockRejectedValue(updateError); // Simulate update failure
    
            await expect(orphanedCardServiceInstance.linkOrphanedCard(orphanId, patientId))
            .rejects.toThrow('Failed to update original caution card.');

        expect(OrphanedCautionCardRepository.delete).not.toHaveBeenCalled(); // Should not delete if update fails
        expect(WebSocketHandler.emitCautionCardFinalized).not.toHaveBeenCalled();
        expect(WebSocketHandler.emitOrphanListUpdated).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Error updating original caution card ${mockOrphanCard.originalCardId} during orphan link:`, updateError);
    });

    it('should log error but proceed if deleting orphaned card fails', async () => {
            const deleteError = new Error('Delete Failed');
            OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard);
            mockPatientRepositoryFindById.mockResolvedValue(mockPatient); // Use specific mock
            CautionCardRepository.update.mockResolvedValue([1]);
            OrphanedCautionCardRepository.delete.mockRejectedValue(deleteError); // Simulate delete failure

        const result = await orphanedCardServiceInstance.linkOrphanedCard(orphanId, patientId);

        // Verify that the core logic (update, events) still happened
        expect(CautionCardRepository.update).toHaveBeenCalled();
        expect(WebSocketHandler.emitCautionCardFinalized).toHaveBeenCalled();
        expect(WebSocketHandler.emitOrphanListUpdated).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Error deleting orphaned card ${orphanId} after linking:`, deleteError);
        // The operation is still considered successful from the user's perspective
        expect(result).toEqual({ success: true, message: `Orphaned card ${orphanId} linked to patient ${patientId}.` });
    });
  });

  // --- deleteOrphanedCard Tests ---
  describe('deleteOrphanedCard', () => {
    const orphanId = 'orphan-to-delete';
    const mockOrphanCard = { id: orphanId, originalCardId: 'card-del', reviewedData: { name: 'Test' } };

    it('should successfully delete an orphaned card', async () => {
        OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard); // Need to find it first to get originalCardId
        OrphanedCautionCardRepository.delete.mockResolvedValue(1); // Simulate successful delete

        const result = await orphanedCardServiceInstance.deleteOrphanedCard(orphanId);

        expect(OrphanedCautionCardRepository.findById).toHaveBeenCalledWith(orphanId);
        expect(OrphanedCautionCardRepository.delete).toHaveBeenCalledWith(orphanId);
        expect(WebSocketHandler.emitOrphanListUpdated).toHaveBeenCalledWith({
            type: 'removed',
            cardId: mockOrphanCard.originalCardId, // Use originalCardId for consistency? Check service logic
            orphanId: orphanId,
        });
        expect(result).toEqual({ success: true, message: `Orphaned card ${orphanId} deleted.` });
        expect(logger.info).toHaveBeenCalledWith(`Deleting orphaned card ID: ${orphanId}`);
    });

    it('should throw AppError if orphaned card not found for deletion', async () => {
        OrphanedCautionCardRepository.findById.mockResolvedValue(null); // Card not found

        await expect(orphanedCardServiceInstance.deleteOrphanedCard(orphanId))
            .rejects.toThrow(new AppError(`OrphanedCautionCard with ID ${orphanId} not found.`, 404));

        expect(OrphanedCautionCardRepository.delete).not.toHaveBeenCalled();
        expect(WebSocketHandler.emitOrphanListUpdated).not.toHaveBeenCalled();
    });

    it('should throw error if repository delete operation fails', async () => {
        const deleteError = new Error('DB Delete Error');
        OrphanedCautionCardRepository.findById.mockResolvedValue(mockOrphanCard);
        OrphanedCautionCardRepository.delete.mockRejectedValue(deleteError); // Simulate delete failure

        await expect(orphanedCardServiceInstance.deleteOrphanedCard(orphanId))
            .rejects.toThrow('Failed to delete orphaned card.');

        expect(WebSocketHandler.emitOrphanListUpdated).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Error deleting orphaned card ${orphanId}:`, deleteError);
    });
  });
});