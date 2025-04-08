const { db } = require('../database/init');
const bcrypt = require('bcrypt');
const { ValidationError } = require('../errors/ValidationError');

class UserController {
  // Get all users
  async getAllUsers() {
    try {
      const users = db.prepare(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        JOIN roles r ON u.role_id = r.id
        ORDER BY u.username
      `).all();

      return users.map(user => ({
        ...user,
        permissions: JSON.parse(user.permissions)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const user = db.prepare(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
      `).get(username);

      if (!user) {
        throw new ValidationError('User not found', 404);
      }

      return {
        ...user,
        permissions: JSON.parse(user.permissions)
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to fetch user');
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      const { username, email, password, role, firstName, lastName } = userData;

      // Check if username or email already exists
      const existingUser = db.prepare(`
        SELECT username, email FROM users 
        WHERE username = ? OR email = ?
      `).get(username, email);

      if (existingUser) {
        throw new ValidationError(
          existingUser.username === username ? 'Username already exists' : 'Email already exists',
          400
        );
      }

      // Get role ID
      const roleId = db.prepare('SELECT id FROM roles WHERE name = ?').get(role)?.id;
      if (!roleId) {
        throw new ValidationError('Invalid role', 400);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      const result = db.prepare(`
        INSERT INTO users (
          username, email, password_hash, role_id, 
          first_name, last_name, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(username, email, passwordHash, roleId, firstName, lastName);

      return this.getUserById(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to create user');
    }
  }

  // Update user
  async updateUser(username, updateData) {
    try {
      const { firstName, lastName, email, isActive } = updateData;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = db.prepare(`
          SELECT username FROM users 
          WHERE email = ? AND username != ?
        `).get(email, username);

        if (existingUser) {
          throw new ValidationError('Email already exists', 400);
        }
      }

      // Update user
      const result = db.prepare(`
        UPDATE users 
        SET first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            is_active = COALESCE(?, is_active),
            updated_at = datetime('now')
        WHERE username = ?
      `).run(firstName, lastName, email, isActive, username);

      if (result.changes === 0) {
        throw new ValidationError('User not found', 404);
      }

      return this.getUserByUsername(username);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to update user');
    }
  }

  // Change password
  async changePassword(username, currentPassword, newPassword) {
    try {
      // Get user
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        throw new ValidationError('User not found', 404);
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        throw new ValidationError('Current password is incorrect', 401);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      db.prepare(`
        UPDATE users 
        SET password_hash = ?, updated_at = datetime('now')
        WHERE username = ?
      `).run(passwordHash, username);

      return { message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to change password');
    }
  }

  // Assign role to user
  async assignRole(username, role) {
    try {
      // Get role ID
      const roleId = db.prepare('SELECT id FROM roles WHERE name = ?').get(role)?.id;
      if (!roleId) {
        throw new ValidationError('Invalid role', 400);
      }

      // Update user role
      const result = db.prepare(`
        UPDATE users 
        SET role_id = ?, updated_at = datetime('now')
        WHERE username = ?
      `).run(roleId, username);

      if (result.changes === 0) {
        throw new ValidationError('User not found', 404);
      }

      return this.getUserByUsername(username);
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to assign role');
    }
  }

  // Helper method to get user by ID
  async getUserById(id) {
    const user = db.prepare(`
      SELECT u.*, r.name as role_name, r.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(id);

    if (!user) {
      throw new ValidationError('User not found', 404);
    }

    return {
      ...user,
      permissions: JSON.parse(user.permissions)
    };
  }
}

module.exports = new UserController(); 