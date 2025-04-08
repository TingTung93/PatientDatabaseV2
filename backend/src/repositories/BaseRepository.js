/**
 * Base Repository class
 * Provides common database operations for all repositories
 */
class BaseRepository {
  /**
   * Create a new repository instance
   * @param {Object} model - Sequelize model
   */
  constructor(model) {
    if (!model) {
      throw new Error('Sequelize model is required');
    }
    this.model = model;
  }

  /**
   * Find a record by ID
   * @param {number} id - Record ID
   * @param {Object} options - Query options
   * @returns {Object|null} - Found record or null
   */
  async findById(id, options = {}) {
    return await this.model.findByPk(id, options);
  }

  /**
   * Find all records, optionally with filters
   * @param {Object} options - Query options
   * @returns {Array} - Array of records
   */
  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {Object} options - Query options
   * @returns {Object} - Created record
   */
  async create(data, options = {}) {
    return await this.model.create(data, options);
  }

  /**
   * Update a record
   * @param {number} id - Record ID
   * @param {Object} data - Record data
   * @param {Object} options - Query options
   * @returns {Object} - Updated record
   */
  async update(id, data, options = {}) {
    const [affectedCount] = await this.model.update(data, {
      where: { id },
      ...options
    });

    if (affectedCount === 0) {
      return null;
    }

    return await this.findById(id, options);
  }

  /**
   * Delete a record
   * @param {number} id - Record ID
   * @param {Object} options - Query options
   * @returns {boolean} - Success indicator
   */
  async delete(id, options = {}) {
    return await this.model.destroy({
      where: { id },
      ...options
    });
  }

  /**
   * Count records
   * @param {Object} options - Query options
   * @returns {number} - Record count
   */
  async count(options = {}) {
    return await this.model.count(options);
  }

  /**
   * Find one record
   * @param {Object} options - Query options
   * @returns {Object|null} - Found record or null
   */
  async findOne(options = {}) {
    return await this.model.findOne(options);
  }

  /**
   * Bulk create records
   * @param {Array} data - Array of record data
   * @param {Object} options - Query options
   * @returns {Array} - Array of created records
   */
  async bulkCreate(data, options = {}) {
    return await this.model.bulkCreate(data, options);
  }
}

module.exports = BaseRepository;