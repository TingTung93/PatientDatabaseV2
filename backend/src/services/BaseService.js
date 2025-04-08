const { NotFoundError } = require('../errors/AppError');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async findById(id) {
    const result = await this.repository.findById(id);
    if (!result) {
      throw new NotFoundError(`${this.constructor.name.replace('Service', '')} not found`);
    }
    return result;
  }

  async findAll(filters = {}) {
    return this.repository.findAll(filters);
  }

  async create(data) {
    return this.repository.create(data);
  }

  async update(id, data) {
    const exists = await this.repository.findById(id);
    if (!exists) {
      throw new NotFoundError(`${this.constructor.name.replace('Service', '')} not found`);
    }
    return this.repository.update(id, data);
  }

  async delete(id) {
    const exists = await this.repository.findById(id);
    if (!exists) {
      throw new NotFoundError(`${this.constructor.name.replace('Service', '')} not found`);
    }
    return this.repository.delete(id);
  }

  async count(filters = {}) {
    return this.repository.count(filters);
  }
}

module.exports = BaseService; 