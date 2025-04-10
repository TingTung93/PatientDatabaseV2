/**
 * User Repository
 * This class handles all database operations related to users.
 */
const bcrypt = require('bcrypt');
const { dbInstance } = require('../database/init');
const logger = require('../utils/logger');
const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor(db) {
    super(db || dbInstance);
    this.tableName = 'users';
  }

  async findAll() {
    try {
      const query = 'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY username';
      return await this.query(query);
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = 'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?';
      return await this.queryOne(query, [id]);
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = ?';
      return await this.queryOne(query, [username]);
    } catch (error) {
      logger.error('Error in findByUsername:', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = ?';
      return await this.queryOne(query, [email]);
    } catch (error) {
      logger.error('Error in findByEmail:', error);
      throw error;
    }
  }

  async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const query = 'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)';
      const params = [
        userData.username,
        userData.email,
        hashedPassword,
        userData.role || 'user'
      ];
      
      const result = await this.run(query, params);
      
      return {
        id: result.lastID,
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

      const result = await this.run(query, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      const result = await this.run(query, [id]);
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

module.exports = UserRepository;