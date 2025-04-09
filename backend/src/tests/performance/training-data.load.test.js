const request = require('supertest');
// Ensure app.js exports the fully configured Express app instance
const app = require('../../src/app').app; // Assuming app.js exports { app, Application }
// const server = require('../../src/server'); // REMOVE THIS - Don't import the main server
const { generateToken } = require('../../src/utils/authUtils'); // Import the token generator
const { sequelize } = require('../../src/database/db');

let serverInstance; // Rename to avoid conflict with the removed server variable
let authToken;

describe('Training Data Load Tests', () => {
  beforeAll(async () => {
    // Initialize dependencies if app doesn't do it on import
    // await app.initializeDatabase(); // Example if needed
    serverInstance = app.listen(0); // Now app should be the listenable instance
    authToken = generateToken({ id: 1, role: 'admin' });
  });

  afterAll(async () => {
    // Close test server
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
    // Close DB connection if needed (might be handled globally)
    // await sequelize.close(); 
  });

  it('should handle concurrent correction submissions', async () => {
    const corrections = Array.from({ length: 10 }, (_, i) => ({ /* ... correction data ... */ }));
    const promises = corrections.map(correction =>
      request(serverInstance) // Use the test server instance
        .post('/api/training-data/corrections')
        .set('Authorization', `Bearer ${authToken}`)
        .send(correction)
    );
    const responses = await Promise.all(promises);
    responses.forEach(res => expect(res.statusCode).toBe(201));
  });

  it('should handle concurrent data retrieval requests', async () => {
    const promises = Array.from({ length: 20 }).map(() =>
      request(serverInstance) // Use the test server instance
        .get('/api/training-data?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
    );
    const responses = await Promise.all(promises);
    responses.forEach(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  it('should handle batch operations under load', async () => {
    const batchData = Array.from({ length: 50 }, (_, i) => ({ /* ... training data ... */ }));
    const res = await request(serverInstance) // Use the test server instance
      .post('/api/training-data/batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ items: batchData });
    expect(res.statusCode).toBe(201);
    // Add more assertions based on expected batch response
  });
}); 