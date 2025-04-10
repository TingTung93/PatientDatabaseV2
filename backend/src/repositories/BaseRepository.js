/**
 * Base Repository class
 * Provides common database operations for all repositories
 */
class BaseRepository {
  /**
   * Create a new repository instance
   * @param {Object} db - SQLite database instance
   */
  constructor(db) {
    if (!db) {
      throw new Error('Database instance is required');
    }
    this.db = db;
  }

  /**
   * Find a record by ID
   * @param {number|string} id - Record ID
   * @param {string} tableName - Table name
   * @returns {Promise<Object|null>} - Found record or null
   */
  async findById(id, tableName) {
    if (!tableName) {
      tableName = this.tableName;
    }
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.get(query, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * Find all records, optionally with filters
   * @param {string} tableName - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<Array>} - Array of records
   */
  async findAll(tableName, where = {}) {
    if (!tableName) {
      tableName = this.tableName;
    }
    
    const conditions = [];
    const params = [];
    
    Object.keys(where).forEach(key => {
      conditions.push(`${key} = ?`);
      params.push(where[key]);
    });
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
      
    const query = `SELECT * FROM ${tableName} ${whereClause}`;
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Create a new record
   * @param {string} tableName - Table name
   * @param {Object} data - Record data
   * @returns {Promise<Object>} - Created record with ID
   */
  async create(tableName, data) {
    if (!tableName) {
      tableName = this.tableName;
    }
    
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else {
          // Return the created record with its ID
          resolve({
            id: this.lastID,
            ...data
          });
        }
      });
    });
  }

  /**
   * Update a record
   * @param {string} tableName - Table name
   * @param {number|string} id - Record ID
   * @param {Object} data - Record data
   * @returns {Promise<Object>} - Updated record
   */
  async update(tableName, id, data) {
    if (!tableName) {
      tableName = this.tableName;
    }
    
    const columns = Object.keys(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            resolve(null);
          } else {
            // Return the updated record
            resolve({
              id,
              ...data
            });
          }
        }
      });
    });
  }

  /**
   * Delete a record
   * @param {string} tableName - Table name
   * @param {number|string} id - Record ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async delete(tableName, id) {
    if (!tableName) {
      tableName = this.tableName;
    }
    
    const query = `DELETE FROM ${tableName} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.run(query, [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Count records
   * @param {string} tableName - Table name
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} - Record count
   */
  async count(tableName, where = {}) {
    if (!tableName) {
      tableName = this.tableName;
    }
    
    const conditions = [];
    const params = [];
    
    Object.keys(where).forEach(key => {
      conditions.push(`${key} = ?`);
      params.push(where[key]);
    });
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
      
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }

  /**
   * Execute a custom query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async query(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Execute a custom query and return a single result
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query result
   */
  async queryOne(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * Execute a query that modifies the database
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Result with changes and lastID
   */
  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else {
          resolve({
            changes: this.changes,
            lastID: this.lastID
          });
        }
      });
    });
  }
}

module.exports = BaseRepository;