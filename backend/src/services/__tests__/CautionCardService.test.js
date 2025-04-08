const AppError = require('../../errors/AppError'); // Import AppError
const CautionCardRepository = require('../../repositories/CautionCardRepository');
const OrphanedCautionCardRepository = require('../../repositories/OrphanedCautionCardRepository');
const PatientRepository = require('../../repositories/PatientRepository');
const logger = require('../../utils/logger');
const WebSocketHandler = require('../../websocket/handler');
const CautionCardService = require('../CautionCardService');
// const OcrService = require('../OcrService'); // Mock if/when used

// --- Mock Dependencies ---
jest.mock('../../repositories/CautionCardRepository');
jest.mock('../../repositories/OrphanedCautionCardRepository');
// Mock the PatientRepository module and its constructor/methods
const mockPatientRepositoryFindById = jest.fn();
jest.mock('../../repositories/PatientRepository', () => {
    return jest.fn().mockImplementation(() => { // Mock the constructor
        return {
            // Mock instance methods used by CautionCardService
            findById: mockPatientRepositoryFindById,
            // Add other methods if needed
        };
    });
});
jest.mock('../../websocket/handler');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));
// jest.mock('../OcrService'); // Mock if/when used

// Use fake timers to control setTimeout in triggerOcrProcessing
jest.useFakeTimers();

describe('CautionCardService', () => {
  let cautionCardServiceInstance;
  let mockPatientRepositoryInstance; // To access the mocked instance methods

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    CautionCardRepository.create.mockReset();
    CautionCardRepository.findById.mockReset();
    CautionCardRepository.update.mockReset();
    CautionCardRepository.findAndCountAll.mockReset();
    OrphanedCautionCardRepository.create.mockReset();
    
    // Reset the specific mock function for PatientRepository.findById
    mockPatientRepositoryFindById.mockReset();


    WebSocketHandler.emitCautionCardReadyForReview.mockReset();
    WebSocketHandler.emitCautionCardFinalized.mockReset();
    WebSocketHandler.emitOrphanListUpdated.mockReset();

    // Create a new instance for each test if the service has state (it doesn't seem to)
    // cautionCardServiceInstance = new CautionCardService(); 
    // Since it's exported as `new CautionCardService()`, we test the exported instance directly.
    cautionCardServiceInstance = require('../CautionCardService'); 
    
    // Spy on triggerOcrProcessing to check if it's called without executing its content in processNewCard tests
    jest.spyOn(cautionCardServiceInstance, 'triggerOcrProcessing').mockImplementation(async () => {});
  });

   afterEach(() => {
     // Restore original implementation of spied methods
     jest.restoreAllMocks();
   });

  // --- processNewCard Tests ---
  describe('processNewCard', () => {
    const mockFile = {
      originalname: 'test-card.jpg',
      path: 'uploads/temp/test-card.jpg',
      // Add other properties if needed by the service
    };
    const mockCreatedCard = {
      id: 'card-123',
      originalFilePath: mockFile.path,
      status: 'processing_ocr',
    };

    it('should create an initial card record and trigger OCR', async () => {
      CautionCardRepository.create.mockResolvedValue(mockCreatedCard);

      const result = await cautionCardServiceInstance.processNewCard(mockFile);

      expect(CautionCardRepository.create).toHaveBeenCalledWith({
        originalFilePath: mockFile.path,
        status: 'processing_ocr',
      });
      expect(cautionCardServiceInstance.triggerOcrProcessing).toHaveBeenCalledWith(mockCreatedCard.id, mockFile.path);
      expect(result).toEqual({ cardId: mockCreatedCard.id, status: mockCreatedCard.status });
      expect(logger.info).toHaveBeenCalledWith(`Processing new caution card file: ${mockFile.originalname}`);
      expect(logger.debug).toHaveBeenCalledWith(`Created initial CautionCard record with ID: ${mockCreatedCard.id}`);
    });

    it('should throw error if creating initial record fails', async () => {
      const dbError = new Error('DB connection failed');
      CautionCardRepository.create.mockRejectedValue(dbError);

      await expect(cautionCardServiceInstance.processNewCard(mockFile))
        .rejects.toThrow('Failed to save initial card information.');

      expect(CautionCardRepository.create).toHaveBeenCalled();
      expect(cautionCardServiceInstance.triggerOcrProcessing).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error creating initial CautionCard record:', dbError);
    });
  });

  // --- triggerOcrProcessing Tests ---
  describe('triggerOcrProcessing (Simulated Background Task)', () => {
     // Restore real implementation for this describe block
     beforeEach(() => {
        jest.restoreAllMocks(); // Restore spy from outer scope
     });

    const cardId = 'card-abc';
    const filePath = 'path/to/file.pdf';
    const mockCard = { id: cardId, status: 'processing_ocr' };
    const simulatedOcrResults = { name: 'Sim OCR Name', dob: '2024-01-01' };

    it('should simulate OCR, update card status, and emit WebSocket event', async () => {
      CautionCardRepository.findById.mockResolvedValue(mockCard);
      CautionCardRepository.update.mockResolvedValue([1]); // Simulate 1 row updated

      // Call the function - it schedules the setTimeout
      cautionCardServiceInstance.triggerOcrProcessing(cardId, filePath);

      // Fast-forward time past the simulated delay
      jest.advanceTimersByTime(5100); // Advance past 5000ms timeout

      // Wait for promises within setTimeout to resolve
      await Promise.resolve();

      expect(CautionCardRepository.findById).toHaveBeenCalledWith(cardId);
      expect(CautionCardRepository.update).toHaveBeenCalledWith(cardId, {
        ocrResults: simulatedOcrResults,
        status: 'pending_review',
      });
      expect(WebSocketHandler.emitCautionCardReadyForReview).toHaveBeenCalledWith({
        cardId: cardId,
        ocrResults: simulatedOcrResults,
      });
      expect(logger.info).toHaveBeenCalledWith(`OCR complete, card ${cardId} status updated to pending_review.`);
    });

    it('should log warning if card not found after OCR', async () => {
      CautionCardRepository.findById.mockResolvedValue(null); // Simulate card deleted during OCR

      cautionCardServiceInstance.triggerOcrProcessing(cardId, filePath);
      jest.advanceTimersByTime(5100);
      await Promise.resolve(); 

      expect(CautionCardRepository.findById).toHaveBeenCalledWith(cardId);
      expect(CautionCardRepository.update).not.toHaveBeenCalled();
      expect(WebSocketHandler.emitCautionCardReadyForReview).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(`Card ${cardId} not found after OCR processing.`);
    });

    it('should handle errors during simulated OCR processing', async () => {
       // Simulate error during the update phase after OCR
       const updateError = new Error('Failed to update DB');
       CautionCardRepository.findById.mockResolvedValue(mockCard);
       CautionCardRepository.update.mockRejectedValue(updateError);

       cautionCardServiceInstance.triggerOcrProcessing(cardId, filePath);
       jest.advanceTimersByTime(5100); 
       await Promise.resolve();

       expect(CautionCardRepository.findById).toHaveBeenCalledWith(cardId);
       expect(CautionCardRepository.update).toHaveBeenCalled(); // Update was attempted
       expect(WebSocketHandler.emitCautionCardReadyForReview).not.toHaveBeenCalled();
       expect(logger.error).toHaveBeenCalledWith(`Background OCR processing failed for card ID ${cardId}:`, updateError);
       // TODO: Check if status is updated to 'ocr_failed' if that logic is added
    });
  });

  // --- finalizeCard Tests ---
  describe('finalizeCard', () => {
     // Restore real implementation for this describe block
     beforeEach(() => {
        jest.restoreAllMocks(); 
        // Re-setup PatientRepository mock for this scope if needed
        mockPatientRepositoryInstance = new PatientRepository(); 
        PatientRepository.mockImplementation(() => mockPatientRepositoryInstance);
        if (!jest.isMockFunction(mockPatientRepositoryInstance.findById)) {
            mockPatientRepositoryInstance.findById = jest.fn();
        }
        mockPatientRepositoryInstance.findById.mockReset();
     });

     const cardId = 'card-to-finalize';
     const mockCardPending = { id: cardId, status: 'pending_review', originalFilePath: 'path/orig.jpg', ocrResults: { name: 'OCR Name' } };
     const mockPatient = { id: 'patient-linked' };
     const reviewedData = { name: 'Reviewed Name', dob: '2000-01-01' };

     it('should link card to patient successfully', async () => {
        CautionCardRepository.findById.mockResolvedValueOnce(mockCardPending); // Initial find
        mockPatientRepositoryInstance.findById.mockResolvedValue(mockPatient); // Patient exists
        CautionCardRepository.update.mockResolvedValue([1]);
        CautionCardRepository.findById.mockResolvedValueOnce({ ...mockCardPending, status: 'linked', linkedPatientId: mockPatient.id, reviewedData }); // Final find

        const result = await cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, linkedPatientId: mockPatient.id, isOrphaned: false });

        expect(CautionCardRepository.findById).toHaveBeenCalledWith(cardId);
        expect(mockPatientRepositoryInstance.findById).toHaveBeenCalledWith(mockPatient.id);
        expect(CautionCardRepository.update).toHaveBeenCalledWith(cardId, {
            reviewedData,
            status: 'linked',
            linkedPatientId: mockPatient.id
        });
        expect(OrphanedCautionCardRepository.create).not.toHaveBeenCalled();
        expect(WebSocketHandler.emitCautionCardFinalized).toHaveBeenCalledWith({ cardId: cardId, status: 'linked', linkedPatientId: mockPatient.id });
        expect(WebSocketHandler.emitOrphanListUpdated).not.toHaveBeenCalled();
        expect(result.status).toBe('linked');
        expect(result.linkedPatientId).toBe(mockPatient.id);
     });

     it('should mark card as orphaned successfully', async () => {
        CautionCardRepository.findById.mockResolvedValueOnce(mockCardPending);
        OrphanedCautionCardRepository.create.mockResolvedValue({ id: 'orphan-record-id' });
        CautionCardRepository.update.mockResolvedValue([1]);
        CautionCardRepository.findById.mockResolvedValueOnce({ ...mockCardPending, status: 'orphaned', linkedPatientId: null, reviewedData }); // Final find

        const result = await cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, isOrphaned: true });

        expect(CautionCardRepository.findById).toHaveBeenCalledWith(cardId);
        expect(mockPatientRepositoryInstance.findById).not.toHaveBeenCalled();
        expect(CautionCardRepository.update).toHaveBeenCalledWith(cardId, {
            reviewedData,
            status: 'orphaned',
            linkedPatientId: null
        });
        expect(OrphanedCautionCardRepository.create).toHaveBeenCalledWith({
            originalCardId: cardId,
            originalFilePath: mockCardPending.originalFilePath,
            ocrResults: mockCardPending.ocrResults,
            reviewedData: reviewedData,
        });
        expect(WebSocketHandler.emitCautionCardFinalized).toHaveBeenCalledWith({ cardId: cardId, status: 'orphaned' });
        expect(WebSocketHandler.emitOrphanListUpdated).toHaveBeenCalledWith({ type: 'added', cardId: cardId });
        expect(result.status).toBe('orphaned');
        expect(result.linkedPatientId).toBeNull();
     });

     it('should throw error if card not found', async () => {
        CautionCardRepository.findById.mockResolvedValue(null);
        await expect(cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, isOrphaned: true }))
            .rejects.toThrow(`CautionCard with ID ${cardId} not found.`);
     });

     it('should throw error if card status is not pending_review (or similar)', async () => {
        CautionCardRepository.findById.mockResolvedValue({ ...mockCardPending, status: 'linked' }); // Already linked
        await expect(cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, isOrphaned: true }))
            .rejects.toThrow('Card is not in a state that can be finalized.');
     });

     it('should throw error if linking to non-existent patient', async () => {
        CautionCardRepository.findById.mockResolvedValue(mockCardPending);
        mockPatientRepositoryFindById.mockResolvedValue(null); // Use the specific mock function
        await expect(cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, linkedPatientId: 'fake-patient', isOrphaned: false }))
            .rejects.toThrow('Patient with ID fake-patient not found.'); // Keep expected message
     });

     it('should throw error if not linking and not orphaning', async () => {
        CautionCardRepository.findById.mockResolvedValue(mockCardPending);
        await expect(cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, isOrphaned: false /* no linkedPatientId */ }))
            .rejects.toThrow('Finalization requires either linking to a patient or marking as orphaned.');
     });
      
     it('should log error but not fail if creating orphaned record fails', async () => {
        const orphanError = new Error('Orphan DB error');
        CautionCardRepository.findById.mockResolvedValueOnce(mockCardPending);
        OrphanedCautionCardRepository.create.mockRejectedValue(orphanError); // Simulate failure
        CautionCardRepository.update.mockResolvedValue([1]);
        CautionCardRepository.findById.mockResolvedValueOnce({ ...mockCardPending, status: 'orphaned', linkedPatientId: null, reviewedData });

        const result = await cautionCardServiceInstance.finalizeCard(cardId, { reviewedData, isOrphaned: true });

        expect(CautionCardRepository.update).toHaveBeenCalledWith(cardId, expect.objectContaining({ status: 'orphaned' }));
        expect(OrphanedCautionCardRepository.create).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Failed to create OrphanedCautionCard entry for ${cardId}:`, orphanError);
        // Check that finalization still completes and events are emitted
        expect(WebSocketHandler.emitCautionCardFinalized).toHaveBeenCalledWith({ cardId: cardId, status: 'orphaned' });
        expect(WebSocketHandler.emitOrphanListUpdated).toHaveBeenCalledWith({ type: 'added', cardId: cardId });
        expect(result.status).toBe('orphaned'); // Finalization still considered successful
     });
  });

  // --- getCardDetails Tests ---
   describe('getCardDetails', () => {
      // Restore real implementation for this describe block
      beforeEach(() => {
         jest.restoreAllMocks(); 
      });
      
      it('should retrieve card details using repository', async () => {
         const mockCardDetails = { id: 'card-detail-id', status: 'linked', patient: {} };
         CautionCardRepository.findById.mockResolvedValue(mockCardDetails);

         const result = await cautionCardServiceInstance.getCardDetails('card-detail-id');

         expect(CautionCardRepository.findById).toHaveBeenCalledWith('card-detail-id');
         expect(result).toEqual(mockCardDetails);
      });

      it('should throw error if card not found', async () => {
         CautionCardRepository.findById.mockResolvedValue(null);
         await expect(cautionCardServiceInstance.getCardDetails('not-found-id'))
            .rejects.toThrow('CautionCard with ID not-found-id not found.');
      });
   });

  // --- getLinkingSuggestions Tests ---
   describe('getLinkingSuggestions', () => {
      // Restore real implementation for this describe block
      beforeEach(() => {
         jest.restoreAllMocks(); 
      });
      
      it('should return empty array (as scoring is not implemented)', async () => {
         // Mock findById to return a card with OCR results
         CautionCardRepository.findById.mockResolvedValue({ id: 'suggest-id', ocrResults: { name: 'Test' } });
         
         const result = await cautionCardServiceInstance.getLinkingSuggestions('suggest-id');

         expect(CautionCardRepository.findById).toHaveBeenCalledWith('suggest-id');
         expect(result).toEqual([]);
         expect(logger.warn).toHaveBeenCalledWith('Similarity scoring not implemented yet for card suggest-id. Returning empty suggestions.');
      });

      it('should throw error if card not found', async () => {
         CautionCardRepository.findById.mockResolvedValue(null);
         await expect(cautionCardServiceInstance.getLinkingSuggestions('not-found-id'))
            .rejects.toThrow('Cannot generate suggestions for card not-found-id: Not found or OCR not complete.');
      });

       it('should throw error if card has no OCR results', async () => {
         CautionCardRepository.findById.mockResolvedValue({ id: 'suggest-id', ocrResults: null }); // No OCR results
         await expect(cautionCardServiceInstance.getLinkingSuggestions('suggest-id'))
            .rejects.toThrow('Cannot generate suggestions for card suggest-id: Not found or OCR not complete.');
      });
   });

  // --- listCards Tests ---
   describe('listCards', () => {
      // Restore real implementation for this describe block
      beforeEach(() => {
         jest.restoreAllMocks(); 
      });
      
      it('should call repository findAndCountAll with filters', async () => {
         const filters = { status: 'pending_review', limit: 15, offset: 30 };
         const mockRepoResult = { count: 50, rows: [{ id: 'card1' }] };
         CautionCardRepository.findAndCountAll.mockResolvedValue(mockRepoResult);

         const result = await cautionCardServiceInstance.listCards(filters);

         expect(CautionCardRepository.findAndCountAll).toHaveBeenCalledWith(filters);
         expect(result).toEqual({ cards: mockRepoResult.rows, pagination: { totalItems: mockRepoResult.count } });
         expect(logger.debug).toHaveBeenCalledWith('Listing caution cards with filters:', filters);
      });
   });

});