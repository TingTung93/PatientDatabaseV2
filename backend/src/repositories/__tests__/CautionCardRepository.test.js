const db = require('../../database/models'); // Path to your Sequelize models index
const AppError = require('../../errors/AppError');
const logger = require('../../utils/logger');
const CautionCardRepository = require('../CautionCardRepository');

// --- Mock Dependencies ---
// Mock the db object and the specific models used by the repository
const mockCautionCardModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(), // If delete method exists in repo
};
const mockPatientModel = {
  // Mock methods if Patient model is directly used for associations, etc.
};
const mockOrphanedCardModel = {
    // Mock methods if OrphanedCautionCard model is directly used
};

jest.mock('../../database/models', () => ({
  CautionCard: mockCautionCardModel,
  Patient: mockPatientModel,
  OrphanedCautionCard: mockOrphanedCardModel,
  // Add other models if needed
  sequelize: { // Mock sequelize instance if needed (e.g., for transactions)
    transaction: jest.fn(),
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('CautionCardRepository', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockCautionCardModel.create.mockReset();
    mockCautionCardModel.findByPk.mockReset();
    mockCautionCardModel.findAndCountAll.mockReset();
    mockCautionCardModel.update.mockReset();
    mockCautionCardModel.destroy.mockReset();
    // Reset other model mocks if used
  });

  // --- create Tests ---
  describe('create', () => {
    it('should call CautionCard.create with provided data', async () => {
      // Arrange
      const cardData = { originalFilePath: 'path/file.jpg', status: 'processing_ocr' };
      const createdCard = { id: 'new-card-id', ...cardData };
      mockCautionCardModel.create.mockResolvedValue(createdCard);

      // Act
      const result = await CautionCardRepository.create(cardData);

      // Assert
      expect(mockCautionCardModel.create).toHaveBeenCalledWith(cardData);
      expect(result).toEqual(createdCard);
      expect(logger.debug).toHaveBeenCalledWith('Creating CautionCard:', cardData);
    });

    it('should handle errors from CautionCard.create', async () => {
        // Arrange
        const cardData = { originalFilePath: 'path/fail.jpg' };
        const dbError = new Error('Sequelize Create Error');
        mockCautionCardModel.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(CautionCardRepository.create(cardData))
            .rejects.toThrow(dbError); // Repository might just re-throw

        expect(logger.error).toHaveBeenCalledWith('Error creating CautionCard:', dbError);
    });
  });

  // --- findById Tests ---
  describe('findById', () => {
    it('should call CautionCard.findByPk with correct id and include Patient', async () => {
        // Arrange
        const cardId = 'find-me-id';
        const mockCard = { id: cardId, status: 'linked', Patient: { id: 'p1' } };
        mockCautionCardModel.findByPk.mockResolvedValue(mockCard);

        // Act
        const result = await CautionCardRepository.findById(cardId);

        // Assert
        expect(mockCautionCardModel.findByPk).toHaveBeenCalledWith(cardId, {
            include: [{ model: db.Patient, as: 'Patient' }] // Verify association include
        });
        expect(result).toEqual(mockCard);
        expect(logger.debug).toHaveBeenCalledWith(`Finding CautionCard by ID: ${cardId}`);
    });

     it('should return null if CautionCard.findByPk returns null', async () => {
        // Arrange
        const cardId = 'not-found-id';
        mockCautionCardModel.findByPk.mockResolvedValue(null);

        // Act
        const result = await CautionCardRepository.findById(cardId);

        // Assert
        expect(mockCautionCardModel.findByPk).toHaveBeenCalledWith(cardId, expect.any(Object));
        expect(result).toBeNull();
    });

     it('should handle errors from CautionCard.findByPk', async () => {
        // Arrange
        const cardId = 'error-id';
        const dbError = new Error('Sequelize Find Error');
        mockCautionCardModel.findByPk.mockRejectedValue(dbError);

        // Act & Assert
        await expect(CautionCardRepository.findById(cardId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding CautionCard by ID ${cardId}:`, dbError);
    });
  });

  // --- update Tests ---
  describe('update', () => {
     it('should call CautionCard.update with correct id and data', async () => {
        // Arrange
        const cardId = 'update-id';
        const updateData = { status: 'linked', linkedPatientId: 'p1' };
        const updateResult = [1]; // Sequelize update returns [count]
        mockCautionCardModel.update.mockResolvedValue(updateResult);

        // Act
        const result = await CautionCardRepository.update(cardId, updateData);

        // Assert
        expect(mockCautionCardModel.update).toHaveBeenCalledWith(updateData, {
            where: { id: cardId }
        });
        expect(result).toEqual(updateResult); // Repository likely returns the raw result
        expect(logger.debug).toHaveBeenCalledWith(`Updating CautionCard ID ${cardId} with data:`, updateData);
    });

     it('should handle errors from CautionCard.update', async () => {
        // Arrange
        const cardId = 'update-error-id';
        const updateData = { status: 'failed' };
        const dbError = new Error('Sequelize Update Error');
        mockCautionCardModel.update.mockRejectedValue(dbError);

        // Act & Assert
        await expect(CautionCardRepository.update(cardId, updateData))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error updating CautionCard ID ${cardId}:`, dbError);
    });
  });

  // --- findAndCountAll Tests ---
  describe('findAndCountAll', () => {
    it('should call CautionCard.findAndCountAll with default options', async () => {
        // Arrange
        const mockResult = { count: 0, rows: [] };
        mockCautionCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        const result = await CautionCardRepository.findAndCountAll({});

        // Assert
        expect(mockCautionCardModel.findAndCountAll).toHaveBeenCalledWith({
            where: {},
            include: [{ model: db.Patient, as: 'Patient' }],
            limit: 10, // Default limit
            offset: 0,  // Default offset
            order: [['createdAt', 'DESC']] // Default order
        });
        expect(result).toEqual(mockResult);
        expect(logger.debug).toHaveBeenCalledWith('Finding and counting CautionCards with options:', expect.any(Object));
    });

    it('should apply status filter correctly', async () => {
        // Arrange
        const filters = { status: 'pending_review' };
        const mockResult = { count: 1, rows: [{ id: 'card1', status: 'pending_review' }] };
        mockCautionCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await CautionCardRepository.findAndCountAll(filters);

        // Assert
        expect(mockCautionCardModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { status: 'pending_review' },
        }));
    });

     it('should apply limit and offset correctly', async () => {
        // Arrange
        const filters = { limit: 5, offset: 10 };
        const mockResult = { count: 20, rows: [] }; // Rows content doesn't matter here
        mockCautionCardModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await CautionCardRepository.findAndCountAll(filters);

        // Assert
        expect(mockCautionCardModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 5,
            offset: 10,
        }));
    });

     it('should handle errors from CautionCard.findAndCountAll', async () => {
        // Arrange
        const filters = {};
        const dbError = new Error('Sequelize FindAll Error');
        mockCautionCardModel.findAndCountAll.mockRejectedValue(dbError);

        // Act & Assert
        await expect(CautionCardRepository.findAndCountAll(filters))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith('Error finding and counting CautionCards:', dbError);
    });

    // Add more tests for other filters (search, date ranges, etc.) if implemented
  });

  // Add describe block for 'delete' method if it exists in the repository
});