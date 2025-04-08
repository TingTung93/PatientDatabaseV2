const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileStorage {
  constructor(storageDir = 'data') {
    this.storageDir = storageDir;
    this.collections = {};
  }

  async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger.info('Storage directory initialized successfully');
    } catch (error) {
      logger.error('Error initializing storage directory:', error);
      throw error;
    }
  }

  async loadCollection(name) {
    const filePath = path.join(this.storageDir, `${name}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      this.collections[name] = JSON.parse(data);
      logger.info(`Collection ${name} loaded successfully`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.collections[name] = [];
        await this.saveCollection(name);
        logger.info(`Created new collection ${name}`);
      } else {
        logger.error(`Error loading collection ${name}:`, error);
        throw error;
      }
    }
    return this.collections[name];
  }

  async saveCollection(name) {
    const filePath = path.join(this.storageDir, `${name}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(this.collections[name], null, 2));
      logger.info(`Collection ${name} saved successfully`);
    } catch (error) {
      logger.error(`Error saving collection ${name}:`, error);
      throw error;
    }
  }

  async create(collection, data) {
    if (!this.collections[collection]) {
      await this.loadCollection(collection);
    }
    const id = Date.now().toString();
    const item = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.collections[collection].push(item);
    await this.saveCollection(collection);
    return item;
  }

  async findAll(collection) {
    if (!this.collections[collection]) {
      await this.loadCollection(collection);
    }
    return this.collections[collection];
  }

  async findById(collection, id) {
    if (!this.collections[collection]) {
      await this.loadCollection(collection);
    }
    return this.collections[collection].find(item => item.id === id);
  }

  async update(collection, id, data) {
    if (!this.collections[collection]) {
      await this.loadCollection(collection);
    }
    const index = this.collections[collection].findIndex(item => item.id === id);
    if (index === -1) {
      return null;
    }
    const item = { ...this.collections[collection][index], ...data, updatedAt: new Date() };
    this.collections[collection][index] = item;
    await this.saveCollection(collection);
    return item;
  }

  async delete(collection, id) {
    if (!this.collections[collection]) {
      await this.loadCollection(collection);
    }
    const index = this.collections[collection].findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }
    this.collections[collection].splice(index, 1);
    await this.saveCollection(collection);
    return true;
  }
}

const storage = new FileStorage();

module.exports = storage; 