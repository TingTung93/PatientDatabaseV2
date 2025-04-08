const jwt = require('jsonwebtoken');

const config = require('../config/config');
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  DatabaseError,
  ForbiddenError,
  NotFoundError
} = require('../errors/ErrorTypes');
const logger = require('../utils/logger');

/**
 * Auth Service
 * This service encapsulates all business logic related to authentication and authorization.
 */
class AuthService {
  /**
   * Create a new AuthService instance
   * @param {Object} userRepository - Instance of UserRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Register a new user
   * @param {Object} userData - User data (username, password, email, role)
   * @returns {Promise<Object>} - The created user (without password)
   * @throws {BadRequestError} - If required fields are missing or validation fails
   * @throws {ConflictError} - If username or email already exists
   */
  async registerUser({ username, password, email, role }) {
    logger.info('Registering new user');

    // Validate required fields
    if (!username || !password || !email || !role) {
      throw new BadRequestError('Missing required fields', {
        required: ['username', 'password', 'email', 'role'],
        provided: Object.keys({ username, password, email, role }).filter(key =>
          username || password || email || role ? !!({ username, password, email, role })[key] : false
        )
      });
    }

    // Validate email format
    if (!this.userRepository.validateEmail(email)) {
      throw new BadRequestError('Invalid email format', {
        field: 'email',
        value: email,
        reason: 'Must be a valid email address'
      });
    }

    // Check if username exists
    const existingUser = await this.userRepository.getUserByUsername(username);
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }

    // Check if email exists
    const existingEmail = await this.userRepository.getUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Create new user
    try {
      return await this.userRepository.createUser(username, password, email, role);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      if (error.message && error.message.includes('Password')) {
        throw new BadRequestError(error.message, {
          field: 'password',
          reason: error.message
        });
      }
      throw new DatabaseError('Failed to create user', error);
    }
  }

  /**
   * Authenticate a user and generate a JWT token
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} - Object containing token and user info
   * @throws {BadRequestError} - If username or password is missing
   * @throws {UnauthorizedError} - If credentials are invalid
   */
  async loginUser(username, password) {
    logger.info('Authenticating user');

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Missing username or password', {
        required: ['username', 'password'],
        provided: Object.keys({ username, password }).filter(key => 
          !!({ username, password })[key]
        )
      });
    }

    // Authenticate user
    try {
      const user = await this.userRepository.authenticateUser(username, password);
      
      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Generate JWT
      const token = this.generateToken(user);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      throw new DatabaseError('Authentication process failed', error);
    }
  }

  /**
   * Generate a JWT token for a user
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    const env = process.env.NODE_ENV || 'development';
    return jwt.sign(
      { userId: user.id, role: user.role },
      config[env].jwt.secret,
      { expiresIn: config[env].jwt.expiresIn }
    );
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} - Decoded token payload
   * @throws {UnauthorizedError} - If token is invalid or expired
   */
  verifyToken(token) {
    logger.info('Validating token');
    return new Promise((resolve, reject) => {
      const env = process.env.NODE_ENV || 'development';
      jwt.verify(
        token,
        config[env].jwt.secret,
        (err, decoded) => {
          if (err) {
            // Determine the specific type of token error
            if (err.name === 'TokenExpiredError') {
              reject(new UnauthorizedError('Token expired', { expiredAt: err.expiredAt }));
            } else if (err.name === 'JsonWebTokenError') {
              reject(new UnauthorizedError('Invalid token', { reason: err.message }));
            } else {
              reject(new UnauthorizedError('Token verification failed'));
            }
          } else {
            resolve(decoded);
          }
        }
      );
    });
  }

  /**
   * Check if a user has the required role(s)
   * @param {Object} user - User object with role property
   * @param {Array<string>} allowedRoles - Array of allowed roles
   * @returns {boolean} - True if authorized, throws otherwise
   * @throws {ForbiddenError} - If user role is not in allowed roles
   */
  authorizeRole(user, allowedRoles) {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions', {
        required: allowedRoles,
        userRole: user.role
      });
    }
    return true;
  }

  /**
   * Get user by ID
   * @param {number|string} userId - User ID
   * @returns {Promise<Object>} - User object (without sensitive data)
   * @throws {NotFoundError} - If user not found
   */
  async getUserById(userId) {
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Remove sensitive data
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = AuthService;