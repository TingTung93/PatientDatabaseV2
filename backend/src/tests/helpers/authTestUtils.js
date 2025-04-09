const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../src/config/config'); // Assuming JWT secret is here
const { User } = require('../src/database/models'); // Adjust path as needed

/**
 * Creates a test user in the database.
 * NOTE: This is a basic implementation. Adjust based on actual User model and requirements.
 */
const createTestUser = async (userData = {}) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(userData.password || 'password123', saltRounds);

  const defaultUserData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password_hash: hashedPassword, // Use password_hash to match model
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...userData,
  };

  try {
    const user = await User.create(defaultUserData);
    // Return a plain object, excluding the password
    const userJson = user.toJSON();
    delete userJson.password;
    return userJson;
  } catch (error) {
    console.error("Error creating test user:", error);
    throw error;
  }
};

/**
 * Generates a JWT token for a given user payload.
 */
const getAuthToken = (userPayload) => {
  // Ensure payload has necessary fields, especially id
  if (!userPayload || !userPayload.id) {
    throw new Error('User payload must include an id to generate token');
  }
  
  const jwtSecret = config.jwtSecret || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret is not defined in config or environment variables.');
  }

  // Use a standard payload structure expected by your auth middleware
  const payload = {
    user: {
      id: userPayload.id,
      role: userPayload.role || 'user', // Include role if used for authorization
    },
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: '1h' }); // Adjust expiry as needed
};

module.exports = {
  createTestUser,
  getAuthToken,
};