const { Op } = require('sequelize'); // Import Op if used for complex queries

const db = require('../../database/models'); // Path to your Sequelize models index
const logger = require('../../utils/logger');
const OrphanedCautionCardRepository = require('../OrphanedCautionCardRepository');


// --- Mock Dependencies ---
const mockOrphanedCardModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  destroy: jest.fn(),
  // Mock other methods if used
};

// Mock the db object and the specific model
jest.mock('../../database/models', () => ({
  OrphanedCautionCard: mockOrphanedCardModel,
  // Add other models if needed by associations (though likely not for this repo)
  sequelize: { // Mock sequelize instance if needed
    transaction: jest.fn(),
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('OrphanedCautionCardRepository', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockOrphanedCardModel.create.mockReset();
    mockOrphanedCardModel.findByPk.mockReset();
    mockOrphanedCardModel.findAndCountAll.mockReset();
    mockOrphanedCardModel.destroy.mockReset();
  });

  // --- create Tests ---
  describe('create', () => {
    it('should call OrphanedCautionCard.create with provided data', async () => {
      // Arrange
      const orphanData = { originalCardId: 'card-1', originalFilePath: 'path/file.jpg', ocrResults: {}, reviewedData: {} };
      const createdOrphan = { id: 'orphan-1', ...orphanData };
      mockOrphanedCardModel.create.mockResolvedValue(createdOrphan);

      // Act
      const result = await OrphanedCautionCardRepository.create(orphanData);

      // Assert
      expect(mockOrphanedCardModel.create).toHaveBeenCalledWith(orphanData);
      expect(result).toEqual(createdOrphan);
      expect(logger.debug).toHaveBeenCalledWith('Creating OrphanedCautionCard:', orphanData);
    });

    it('should handle errors from OrphanedCautionCard.create', async () => {
        // Arrange
        const orphanData = { originalCardId: 'card-fail' };
        const dbError = new Error('Sequelize Create Error');
        mockOrphanedCardModel.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(OrphanedCautionCardRepository.create(orphanData))
            .rejects.toThrow(dbError); // Repository might just re-throw

        expect(logger.error).toHaveBeenCalledWith('Error creating OrphanedCautionCard:', dbError);
    });
  });

  // --- findById Tests ---
  describe('findById', () => {
    it('should call OrphanedCautionCard.findByPk with correct id', async () => {
        // Arrange
        const orphanId = 'find-orphan-id';
        const mockOrphan = { id: orphanId, originalCardId: 'card-abc' };
        mockOrphanedCardModel.findByPk.mockResolvedValue(mockOrphan);

        // Act
        const result = await OrphanedCautionCardRepository.findById(orphanId);

        // Assert
        expect(mockOrphanedCardModel.findByPk).toHaveBeenCalledWith(orphanId, {}); // Check if any options are passed
        expect(result).toEqual(mockOrphan);
        expect(logger.debug).toHaveBeenCalledWith(`Finding OrphanedCautionCard by ID: ${orphanId}`);
    });

     it('should return null if OrphanedCautionCard.findByPk returns null', async () => {
        // Arrange
        const orphanId = 'not-found-orphan-id';
        mockOrphanedCardModel.findByPk.mockResolvedValue(null);

        // Act
        const result = await OrphanedCautionCardRepository.findById(orphanId);

        // Assert
        expect(mockOrphanedCardModel.findByPk).toHaveBeenCalledWith(orphanId, expect.any(Object));
        expect(result).toBeNull();
    });

     it('should handle errors from OrphanedCautionCard.findByPk', async () => {
        // Arrange
        const orphanId = 'error-orphan-id';
        const dbError = new Error('Sequelize Find Error');
        mockOrphanedCardModel.findByPk.mockRejectedValue(dbError);

        // Act & Assert
        await expect(OrphanedCautionCardRepository.findById(orphanId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding OrphanedCautionCard by ID ${orphanId}:`, dbError);
    });
  });

  // --- delete Tests ---
  describe('delete', () => {
    it('should call OrphanedCautionCard.destroy with correct id', async () => {
        // Arrange
        const orphanId = 'delete-orphan-id';
        const deleteResult = 1; // Sequelize destroy returns number of rows deleted
        mockOrphanedCardModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await OrphanedCautionCardRepository.delete(orphanId);

        // Assert
        expect(mockOrphanedCardModel.destroy).toHaveBeenCalledWith({
            where: { id: orphanId }
        });
        expect(result).toEqual(deleteResult);
        expect(logger.debug).toHaveBeenCalledWith(`Deleting OrphanedCautionCard ID: ${orphanId}`);
    });

     it('should return 0 if no rows are deleted', async () => {
        // Arrange
        const orphanId = 'delete-not-found-id';
        const deleteResult = 0;
        mockOrphanedCardModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await OrphanedCautionCardRepository.delete(orphanId);

        // Assert
        expect(mockOrphanedCardModel.destroy).toHaveBeenCalledWith({ where: { id: orphanId } });
        expect(result).toEqual(0);
    });

     it('should handle errors from OrphanedCautionCard.destroy', async () => {
        // Arrange
        const orphanId = 'delete-error-id';
        const dbError = new Error('Sequelize Destroy Error');
        mockOrphanedCardModel.destroy.mockRejectedValue(dbError);

        // Act & Assert
        await expect(OrphanedCautionCardRepository.delete(orphanId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error deleting OrphanedCautionCard ID ${orphanId}:`, dbError);
    });
  });

  // --- findAndCountAll Tests ---
  describe('findAndCountAll', () => {
    it('should call OrphanedCautionCard.findAndCountAll with default options', async () => {
        // Arrange
        const mockResult = { count: 0, rows: [] };
        mockOrphanedCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        const result = await OrphanedCautionCardRepository.findAndCountAll({});

        // Assert
        expect(mockOrphanedCardModel.findAndCountAll).toHaveBeenCalledWith({
            where: {},
            // include: [], // Add includes if repository uses them
            limit: 10, // Default limit
            offset: 0,  // Default offset
            order: [['createdAt', 'DESC']] // Default order
        });
        expect(result).toEqual(mockResult);
        expect(logger.debug).toHaveBeenCalledWith('Finding and counting OrphanedCautionCards with options:', expect.any(Object));
    });

    it('should apply search filter correctly (if implemented)', async () => {
        // Arrange
        const filters = { search: 'Test Name' };
        const mockResult = { count: 1, rows: [{ id: 'orphan1' }] };
        mockOrphanedCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await OrphanedCautionCardRepository.findAndCountAll(filters);

        // Assert
        // Check the structure of the 'where' clause based on how search is implemented
        // Example: Assuming search looks in reviewedData.name
        expect(mockOrphanedCardModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                // This depends heavily on how JSON search is implemented (LIKE, JSON_EXTRACT, etc.)
                // Example for simple LIKE on a dedicated column (adjust if using JSON):
                // reviewedName: { [Op.like]: '%Test Name%' }
                // OR for JSON (might need specific DB function):
                 [Op.or]: expect.arrayContaining([
                     expect.objectContaining({ /* logic for searching name */ }),
                     // expect.objectContaining({ /* logic for searching other fields */ }),
                 ])
            },
        }));
    });

     it('should apply limit and offset correctly', async () => {
        // Arrange
        const filters = { limit: 20, offset: 40 };
        const mockResult = { count: 100, rows: [] };
        mockOrphanedCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await OrphanedCautionCardRepository.findAndCountAll(filters);

        // Assert
        expect(mockOrphanedCardModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 20,
            offset: 40,
        }));
    });

     it('should handle errors from OrphanedCautionCard.findAndCountAll', async () => {
        // Arrange
        const filters = {};
        const dbError = new Error('Sequelize FindAll Error');
        mockOrphanedCardModel.findAndCountAll.mockRejectedValue(dbError);

        // Act & Assert
        await expect(OrphanedCautionCardRepository.findAndCountAll(filters))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith('Error finding and counting OrphanedCautionCards:', dbError);
    });
  });

});