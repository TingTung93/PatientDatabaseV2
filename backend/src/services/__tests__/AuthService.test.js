const jwt = require('jsonwebtoken');

const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError
} = require('../../errors/ErrorTypes');
const AuthService = require('../AuthService');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    password_hash: 'hashedpassword'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repository
    mockUserRepository = {
      validateEmail: jest.fn(),
      getUserByUsername: jest.fn(),
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      authenticateUser: jest.fn(),
      getUserById: jest.fn()
    };

    // Create service instance
    authService = new AuthService(mockUserRepository);
  });

  describe('registerUser', () => {
    const validUserData = {
      username: 'newuser',
      password: 'Password123!',
      email: 'new@example.com',
      role: 'user'
    };

    it('should successfully register a new user', async () => {
      mockUserRepository.validateEmail.mockReturnValue(true);
      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue({ ...mockUser, ...validUserData });

      const result = await authService.registerUser(validUserData);

      expect(result).toBeDefined();
      expect(mockUserRepository.validateEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserRepository.getUserByUsername).toHaveBeenCalledWith(validUserData.username);
      expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        validUserData.username,
        validUserData.password,
        validUserData.email,
        validUserData.role
      );
    });

    it('should throw BadRequestError when fields are missing', async () => {
      const invalidData = { username: 'test' };
      await expect(authService.registerUser(invalidData))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw BadRequestError when email format is invalid', async () => {
      mockUserRepository.validateEmail.mockReturnValue(false);
      const invalidEmailData = { ...validUserData, email: 'invalid' };
      
      await expect(authService.registerUser(invalidEmailData))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw ConflictError when username already exists', async () => {
      mockUserRepository.validateEmail.mockReturnValue(true);
      mockUserRepository.getUserByUsername.mockResolvedValue(mockUser);
      
      await expect(authService.registerUser(validUserData))
        .rejects
        .toThrow(ConflictError);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUserRepository.validateEmail.mockReturnValue(true);
      mockUserRepository.getUserByUsername.mockResolvedValue(null);
      mockUserRepository.getUserByEmail.mockResolvedValue(mockUser);
      
      await expect(authService.registerUser(validUserData))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('loginUser', () => {
    const credentials = {
      username: 'testuser',
      password: 'password123'
    };

    it('should successfully authenticate user and return token', async () => {
      const mockToken = 'mock.jwt.token';
      mockUserRepository.authenticateUser.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(mockToken);

      const result = await authService.loginUser(credentials.username, credentials.password);

      expect(result).toEqual({
        token: mockToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        }
      });
      expect(mockUserRepository.authenticateUser).toHaveBeenCalledWith(
        credentials.username,
        credentials.password
      );
    });

    it('should throw BadRequestError when credentials are missing', async () => {
      await expect(authService.loginUser())
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw UnauthorizedError when credentials are invalid', async () => {
      mockUserRepository.authenticateUser.mockResolvedValue(null);
      
      await expect(authService.loginUser(credentials.username, credentials.password))
        .rejects
        .toThrow(UnauthorizedError);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'valid.jwt.token';
    const mockDecodedToken = { userId: 1, role: 'user' };

    it('should successfully verify valid token', async () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecodedToken);
      });

      const result = await authService.verifyToken(mockToken);
      expect(result).toEqual(mockDecodedToken);
    });

    it('should throw UnauthorizedError when token is expired', async () => {
      const expiredError = { name: 'TokenExpiredError', expiredAt: new Date() };
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(expiredError);
      });

      await expect(authService.verifyToken(mockToken))
        .rejects
        .toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when token is invalid', async () => {
      const invalidError = { name: 'JsonWebTokenError', message: 'invalid token' };
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(invalidError);
      });

      await expect(authService.verifyToken(mockToken))
        .rejects
        .toThrow(UnauthorizedError);
    });
  });

  describe('authorizeRole', () => {
    it('should return true when user has allowed role', () => {
      const user = { role: 'admin' };
      const allowedRoles = ['admin', 'superuser'];

      expect(authService.authorizeRole(user, allowedRoles)).toBe(true);
    });

    it('should throw ForbiddenError when user role is not allowed', () => {
      const user = { role: 'user' };
      const allowedRoles = ['admin', 'superuser'];

      expect(() => authService.authorizeRole(user, allowedRoles))
        .toThrow(ForbiddenError);
    });
  });

  describe('getUserById', () => {
    it('should return user without sensitive data', async () => {
      mockUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await authService.getUserById(1);
      
      expect(result).not.toHaveProperty('password_hash');
      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role
      });
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      await expect(authService.getUserById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});