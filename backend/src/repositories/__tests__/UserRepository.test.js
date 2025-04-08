const { Op } = require('sequelize'); // Import Op if used

const db = require('../../database/models'); // Path to your Sequelize models index
const logger = require('../../utils/logger');
const UserRepository = require('../UserRepository');


// --- Mock Dependencies ---
const mockUserModel = {
  create: jest.fn(),
  findOne: jest.fn(), // Often used for finding by unique fields like username/email
  findByPk: jest.fn(),
  // Mock other methods if used (e.g., findAndCountAll, destroy)
};

jest.mock('../../database/models', () => ({
  User: mockUserModel,
  // Add other models if needed
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

describe('UserRepository', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockUserModel.create.mockReset();
    mockUserModel.findOne.mockReset();
    mockUserModel.findByPk.mockReset();
  });

  // --- create Tests ---
  describe('create', () => {
    it('should call User.create with provided data', async () => {
      // Arrange
      const userData = { username: 'newuser', password: 'hashedPassword' };
      const createdUser = { id: 'user-xyz', ...userData };
      mockUserModel.create.mockResolvedValue(createdUser);

      // Act
      const result = await UserRepository.create(userData);

      // Assert
      expect(mockUserModel.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUser);
      expect(logger.debug).toHaveBeenCalledWith('Creating User:', userData);
    });

    it('should handle errors from User.create', async () => {
        // Arrange
        const userData = { username: 'failuser' };
        const dbError = new Error('Sequelize Create Error');
        mockUserModel.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(UserRepository.create(userData))
            .rejects.toThrow(dbError); // Repository might just re-throw

        expect(logger.error).toHaveBeenCalledWith('Error creating User:', dbError);
    });
  });

  // --- findByUsername Tests (Assuming it uses findOne) ---
  describe('findByUsername', () => {
    it('should call User.findOne with correct username filter', async () => {
        // Arrange
        const username = 'findme';
        const mockUser = { id: 'user-abc', username: username, password: 'hashedPassword' };
        mockUserModel.findOne.mockResolvedValue(mockUser);

        // Act
        const result = await UserRepository.findByUsername(username);

        // Assert
        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            where: { username: username }
            // include: [] // Add includes if used
        });
        expect(result).toEqual(mockUser);
        expect(logger.debug).toHaveBeenCalledWith(`Finding User by username: ${username}`);
    });

     it('should return null if User.findOne returns null', async () => {
        // Arrange
        const username = 'notfounduser';
        mockUserModel.findOne.mockResolvedValue(null); // Simulate not found

        // Act
        const result = await UserRepository.findByUsername(username);

        // Assert
        expect(mockUserModel.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { username: username }
        }));
        expect(result).toBeNull();
    });

     it('should handle errors from User.findOne', async () => {
        // Arrange
        const username = 'erroruser';
        const dbError = new Error('Sequelize FindOne Error');
        mockUserModel.findOne.mockRejectedValue(dbError);

        // Act & Assert
        await expect(UserRepository.findByUsername(username))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding User by username ${username}:`, dbError);
    });
  });

  // --- findById Tests ---
  describe('findById', () => {
    it('should call User.findByPk with correct id', async () => {
        // Arrange
        const userId = 'user-pk-id';
        const mockUser = { id: userId, username: 'pkuser' };
        mockUserModel.findByPk.mockResolvedValue(mockUser);

        // Act
        const result = await UserRepository.findById(userId);

        // Assert
        expect(mockUserModel.findByPk).toHaveBeenCalledWith(userId, {}); // Check if any options are passed
        expect(result).toEqual(mockUser);
        expect(logger.debug).toHaveBeenCalledWith(`Finding User by ID: ${userId}`);
    });

     it('should return null if User.findByPk returns null', async () => {
        // Arrange
        const userId = 'not-found-pk-id';
        mockUserModel.findByPk.mockResolvedValue(null);

        // Act
        const result = await UserRepository.findById(userId);

        // Assert
        expect(mockUserModel.findByPk).toHaveBeenCalledWith(userId, expect.any(Object));
        expect(result).toBeNull();
    });

     it('should handle errors from User.findByPk', async () => {
        // Arrange
        const userId = 'error-pk-id';
        const dbError = new Error('Sequelize Find Error');
        mockUserModel.findByPk.mockRejectedValue(dbError);

        // Act & Assert
        await expect(UserRepository.findById(userId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding User by ID ${userId}:`, dbError);
    });
  });

  // Add tests for other methods like update, delete, findAndCountAll if they exist
});