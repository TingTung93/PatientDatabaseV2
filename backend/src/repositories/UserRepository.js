/**
 * User Repository
 * This class handles all database operations related to users.
 */
const bcrypt = require('bcrypt');
const { db } = require('../database/init');
const logger = require('../utils/logger');

class UserRepository {
  constructor() {
    this.db = db;
  }

  async findAll() {
    try {
      return this.db.prepare('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY username').all();
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return this.db.prepare('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?').get(id);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    } catch (error) {
      logger.error('Error in findByUsername:', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    } catch (error) {
      logger.error('Error in findByEmail:', error);
      throw error;
    }
  }

  async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const stmt = this.db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
      );
      const result = stmt.run(
        userData.username,
        userData.email,
        hashedPassword,
        userData.role || 'user'
      );
      return {
        id: result.lastInsertRowid,
        username: userData.username,
        email: userData.email,
        role: userData.role || 'user'
      };
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  async update(id, userData) {
    try {
      let query = 'UPDATE users SET ';
      const params = [];
      const updates = [];

      if (userData.username) {
        updates.push('username = ?');
        params.push(userData.username);
      }
      if (userData.email) {
        updates.push('email = ?');
        params.push(userData.email);
      }
      if (userData.password) {
        updates.push('password_hash = ?');
        params.push(await bcrypt.hash(userData.password, 10));
      }
      if (userData.role) {
        updates.push('role = ?');
        params.push(userData.role);
      }

      if (updates.length === 0) {
        return false;
      }

      query += updates.join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params.push(id);

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  async verifyPassword(username, password) {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        return false;
      }
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      logger.error('Error in verifyPassword:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();