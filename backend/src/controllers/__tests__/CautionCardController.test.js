const { CautionCard, OrphanedCautionCard, Patient } = require('../../database/models');
const OcrService = require('../../services/OcrService');
const { WebSocketService } = require('../../services/WebSocketService');
const CautionCardController = require('../CautionCardController');

// Mock the models and services
jest.mock('../../database/models');
jest.mock('../../services/WebSocketService');
jest.mock('../../services/OcrService');

describe('CautionCardController', () => {
  let controller;
  let mockWsService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup WebSocket mock
    mockWsService = {
      emit: jest.fn()
    };
    WebSocketService.getInstance.mockReturnValue(mockWsService);
    
    controller = new CautionCardController();
  });

  describe('processCard', () => {
    const mockFile = {
      path: '/uploads/test.jpg',
      mimetype: 'image/jpeg'
    };

    it('should create a new card and trigger OCR processing', async () => {
      const mockCard = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'processing_ocr'
      };

      CautionCard.create.mockResolvedValue(mockCard);

      const result = await controller.processCard(mockFile);

      expect(CautionCard.create).toHaveBeenCalledWith({
        originalFilePath: mockFile.path,
        status: 'processing_ocr'
      });

      expect(result).toEqual({
        cardId: mockCard.id,
        status: mockCard.status
      });
    });

    it('should handle errors during card processing', async () => {
      const error = new Error('Database error');
      CautionCard.create.mockRejectedValue(error);

      await expect(controller.processCard(mockFile)).rejects.toThrow('Database error');
    });
  });

  describe('finalizeCard', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPatientId = '223e4567-e89b-12d3-a456-426614174000';
    const mockReviewData = { name: 'Test Patient' };

    it('should link card to patient successfully', async () => {
      const mockCard = {
        id: mockCardId,
        save: jest.fn().mockResolvedValue(true)
      };
      const mockPatient = { id: mockPatientId };

      CautionCard.findByPk.mockResolvedValue(mockCard);
      Patient.findByPk.mockResolvedValue(mockPatient);
      CautionCard.sequelize = {
        transaction: jest.fn(callback => callback())
      };

      await controller.finalizeCard(mockCardId, {
        reviewedData: mockReviewData,
        linkedPatientId: mockPatientId,
        isOrphaned: false
      });

      expect(mockCard.save).toHaveBeenCalled();
      expect(mockWsService.emit).toHaveBeenCalledWith('cautionCard:finalized', expect.any(Object));
    });

    it('should mark card as orphaned successfully', async () => {
      const mockCard = {
        id: mockCardId,
        originalFilePath: '/test.jpg',
        ocrResults: { text: 'test' },
        save: jest.fn().mockResolvedValue(true)
      };

      CautionCard.findByPk.mockResolvedValue(mockCard);
      CautionCard.sequelize = {
        transaction: jest.fn(callback => callback())
      };

      await controller.finalizeCard(mockCardId, {
        reviewedData: mockReviewData,
        isOrphaned: true
      });

      expect(OrphanedCautionCard.create).toHaveBeenCalledWith(expect.objectContaining({
        originalCardId: mockCardId,
        reviewedData: mockReviewData
      }), expect.any(Object));
      expect(mockWsService.emit).toHaveBeenCalledWith('cautionCard:finalized', expect.any(Object));
    });

    it('should handle non-existent card', async () => {
      CautionCard.findByPk.mockResolvedValue(null);

      await expect(controller.finalizeCard(mockCardId, {
        reviewedData: mockReviewData,
        isOrphaned: true
      })).rejects.toThrow('Caution card not found');
    });
  });

  describe('getCard', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return card with linked patient and orphaned info', async () => {
      const mockCard = {
        id: mockCardId,
        status: 'linked'
      };

      CautionCard.findByPk.mockResolvedValue(mockCard);

      const result = await controller.getCard(mockCardId);

      expect(CautionCard.findByPk).toHaveBeenCalledWith(mockCardId, expect.any(Object));
      expect(result).toEqual({ card: mockCard });
    });

    it('should handle non-existent card', async () => {
      CautionCard.findByPk.mockResolvedValue(null);

      await expect(controller.getCard(mockCardId)).rejects.toThrow('Caution card not found');
    });
  });

  describe('listCards', () => {
    it('should list cards with pagination', async () => {
      const mockCards = [
        { id: '1', status: 'linked' },
        { id: '2', status: 'pending_review' }
      ];
      const mockCount = 2;

      CautionCard.findAndCountAll.mockResolvedValue({
        rows: mockCards,
        count: mockCount
      });

      const result = await controller.listCards({
        status: 'linked',
        limit: 10,
        offset: 0
      });

      expect(result).toEqual({
        cards: mockCards,
        pagination: {
          total: mockCount,
          offset: 0,
          limit: 10
        }
      });
    });
  });
}); 