const fs = require('fs');
const path = require('path');

const { Sequelize } = require('sequelize');

const logger = require('../utils/logger');

// Use in-memory SQLite for tests
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false // Disable SQL logging in tests
});

// Override logger to prevent console noise during tests
logger.level = 'error'; // Use property assignment instead of method

// Load and initialize models with the test sequelize instance
const models = {};
const modelsDir = path.join(__dirname, '..', 'database', 'models');
fs.readdirSync(modelsDir)
  .filter(file => file.indexOf('.') !== 0 && file !== 'index.js' && file.slice(-3) === '.js')
  .forEach(file => {
    const modelDefinition = require(path.join(modelsDir, file));
    // Check if it's a function expecting (sequelize, DataTypes)
    if (typeof modelDefinition === 'function') {
      const model = modelDefinition(sequelize, Sequelize.DataTypes);
      models[model.name] = model;
    } else {
      // Handle potential direct model exports if structure changes
      logger.warn(`Model file ${file} does not export a function. Skipping initialization.`);
    }
  });

// Associate models if associate method exists
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Make models available globally for tests
global.dbModels = models;

const uploadsDir = path.join(__dirname, '..', '..', 'uploads'); // Define uploads directory path

// Setup before running any tests
beforeAll(async () => {
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    // Sync database with force to ensure clean state
    await sequelize.sync({ force: true });
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Use sequelize.truncate() for potentially more reliable cleanup in SQLite tests
    await sequelize.truncate({ cascade: true });
  } catch (error) {
    console.error('Test cleanup failed:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await sequelize.close();
  } catch (error) {
    console.error('Test database closure failed:', error);
    throw error;
  }
});

// Mock WebSocket service
jest.mock('../services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: () => ({
      emit: jest.fn(),
      broadcast: jest.fn()
    })
  }
}));

// Test helper functions using global.dbModels
global.createTestPatient = async (data = {}) => {
  const defaultData = {
    first_name: 'Test', // Use underscore
    last_name: 'Patient', // Use underscore
    date_of_birth: '1990-01-01', // Use underscore
    medical_record_number: `MRN${Date.now()}${Math.floor(Math.random() * 1000)}`, // Use underscore & ensure uniqueness
    blood_type: 'O POS'
  };

  return await global.dbModels.Patient.create({
    ...defaultData,
    ...data
  });
};

global.createTestCautionCard = async (data = {}) => {
  const defaultData = {
    status: 'processing_ocr',
    originalFilePath: '/test/path/card.jpg',
    ocrResults: null,
    reviewedData: null
  };

  return await global.dbModels.CautionCard.create({
    ...defaultData,
    ...data
  });
};

global.createTestOrphanedCard = async (data = {}) => {
  // An orphaned card needs an original card ID
  const originalCard = await global.createTestCautionCard({ status: 'orphaned' }); // Create a base card
  const defaultData = {
    originalCardId: originalCard.id, // Link to the original card
    originalFilePath: originalCard.originalFilePath || '/test/path/card.jpg',
    ocrResults: originalCard.ocrResults || { name: 'Unknown' },
    reviewedData: originalCard.reviewedData || { name: 'Unknown Patient' }
  };

  return await global.dbModels.OrphanedCautionCard.create({
    ...defaultData,
    ...data
  });
};

// Helper for file upload tests
global.createTestFile = (filename = 'test.jpg', mimeType = 'image/jpeg') => {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: mimeType,
    destination: uploadsDir, // Use defined uploads directory
    filename: `${Date.now()}-${filename}`,
    path: path.join(uploadsDir, `${Date.now()}-${filename}`), // Use path.join for consistency
    size: 1024
  };
 };
 
 // Mock filesystem operations (Commented out promises mock to avoid interference with supertest)
 /*
 jest.mock('fs', () => ({
   ...jest.requireActual('fs'),
   promises: {
     unlink: jest.fn().mockResolvedValue(undefined),
     mkdir: jest.fn().mockResolvedValue(undefined),
     writeFile: jest.fn().mockResolvedValue(undefined),
     readFile: jest.fn().mockResolvedValue(Buffer.from('test file content'))
   }
 }));
 */
 // Remove this basic fs mock to avoid conflicts with more specific mocks in test files
 /*
 jest.mock('fs', () => ({
   ...jest.requireActual('fs')
 }));
 */