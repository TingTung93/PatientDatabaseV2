const { Op } = require('sequelize');

const { OrphanedCautionCard, CautionCard, Patient } = require('../../database/models');
const { WebSocketService } = require('../../services/WebSocketService');
const logger = require('../../utils/logger');
const OrphanedCardController = require('../OrphanedCardController');

// Mock dependencies
jest.mock('../../database/models', () => ({
  OrphanedCautionCard: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    destroy: jest.fn(),
    // Mock transaction support if needed, simplified here
    sequelize: {
      transaction: jest.fn(async (callback) => {
        const t = { rollback: jest.fn(), commit: jest.fn() }; // Mock transaction object
        try {
          const result = await callback(t);
          await t.commit();
          return result;
        } catch (error) {
          await t.rollback();
          throw error;
        }
      }),
    },
  },
  CautionCard: {
    findByPk: jest.fn(),
    save: jest.fn(),
  },
  Patient: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock WebSocketService
const mockEmit = jest.fn();
jest.mock('../../services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      emit: mockEmit,
    })),
  },
}));

describe('OrphanedCardController', () => {
  let mockWsService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup WebSocket mock
    mockWsService = {
      emit: jest.fn()
    };
    WebSocketService.getInstance.mockReturnValue(mockWsService);
  });

  describe('listCards', () => {
    it('should list orphaned cards with pagination', async () => {
      const mockCards = [
        { id: '1', reviewedData: { name: 'Test 1' } },
        { id: '2', reviewedData: { name: 'Test 2' } }
      ];
      const mockCount = 2;

      OrphanedCautionCard.findAndCountAll.mockResolvedValue({
        rows: mockCards,
        count: mockCount
      });

      const result = await OrphanedCardController.listCards({
        limit: 10,
        offset: 0
      });

      expect(result).toEqual({
        orphanedCards: mockCards,
        pagination: {
          total: mockCount,
          offset: 0,
          limit: 10,
          currentPage: 1,
          totalPages: 1
        }
      });
    });

    it('should handle search parameters', async () => {
      const searchTerm = 'test';
      await OrphanedCardController.listCards({
        search: searchTerm,
        limit: 10,
        offset: 0
      });

      expect(OrphanedCautionCard.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          limit: 10,
          offset: 0
        })
      );
    });
  });

  describe('getCard', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return orphaned card details', async () => {
      const mockCard = {
        id: mockCardId,
        reviewedData: { name: 'Test Patient' }
      };

      OrphanedCautionCard.findByPk.mockResolvedValue(mockCard);

      const result = await OrphanedCardController.getCard(mockCardId);

      expect(OrphanedCautionCard.findByPk).toHaveBeenCalledWith(mockCardId);
      expect(result).toEqual({ orphanedCard: mockCard });
    });

    it('should handle non-existent card', async () => {
      OrphanedCautionCard.findByPk.mockResolvedValue(null);

      await expect(OrphanedCardController.getCard(mockCardId))
        .rejects.toThrow('Orphaned card not found');
    });
  });

  describe('linkToPatient', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPatientId = '223e4567-e89b-12d3-a456-426614174000';

    it('should link orphaned card to patient successfully', async () => {
      const mockOrphanedCard = {
        id: mockCardId,
        originalCardId: 'original123',
        reviewedData: { name: 'Test Patient' },
        destroy: jest.fn().mockResolvedValue(true)
      };

      const mockCautionCard = {
        id: 'original123',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockPatient = {
        id: mockPatientId,
        firstName: 'Test',
        lastName: 'Patient',
        medicalRecordNumber: '12345'
      };

      OrphanedCautionCard.findByPk.mockResolvedValue(mockOrphanedCard);
      CautionCard.findByPk.mockResolvedValue(mockCautionCard);
      Patient.findByPk.mockResolvedValue(mockPatient);

      OrphanedCautionCard.sequelize = {
        transaction: jest.fn(callback => callback())
      };

      const result = await OrphanedCardController.linkToPatient(mockCardId, mockPatientId);

      expect(mockCautionCard.save).toHaveBeenCalled();
      expect(mockOrphanedCard.destroy).toHaveBeenCalled();
      expect(mockWsService.emit).toHaveBeenCalledWith('orphan_list_updated', expect.any(Object));
      expect(mockWsService.emit).toHaveBeenCalledWith('caution_card_finalized', expect.any(Object));
      expect(result.message).toBe('Card successfully linked to patient');
    });

    it('should handle non-existent orphaned card', async () => {
      OrphanedCautionCard.findByPk.mockResolvedValue(null);
      OrphanedCautionCard.sequelize = {
        transaction: jest.fn(callback => callback())
      };

      await expect(OrphanedCardController.linkToPatient(mockCardId, mockPatientId))
        .rejects.toThrow('Orphaned card not found');
    });

    it('should handle non-existent patient', async () => {
      const mockOrphanedCard = {
        id: mockCardId,
        originalCardId: 'original123'
      };

      OrphanedCautionCard.findByPk.mockResolvedValue(mockOrphanedCard);
      Patient.findByPk.mockResolvedValue(null);
      OrphanedCautionCard.sequelize = {
        transaction: jest.fn(callback => callback())
      };

      await expect(OrphanedCardController.linkToPatient(mockCardId, mockPatientId))
        .rejects.toThrow('Patient not found');
    });
  });

  describe('deleteCard', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete orphaned card successfully', async () => {
      const mockCard = {
        id: mockCardId,
        destroy: jest.fn().mockResolvedValue(true)
      };

      OrphanedCautionCard.findByPk.mockResolvedValue(mockCard);

      const result = await OrphanedCardController.deleteCard(mockCardId);

      expect(mockCard.destroy).toHaveBeenCalled();
      expect(mockWsService.emit).toHaveBeenCalledWith('orphan_list_updated', {
        type: 'removed',
        cardId: mockCardId
      });
      expect(result.message).toBe('Orphaned card deleted successfully');
    });

    it('should handle non-existent card', async () => {
      OrphanedCautionCard.findByPk.mockResolvedValue(null);

      await expect(OrphanedCardController.deleteCard(mockCardId))
        .rejects.toThrow('Orphaned card not found');
    });
  });
});