const request = require('supertest');
const app = require('../../src/app').app; // Keep assuming named export for now
// Remove DB utils import, rely on global setup
// const { sequelize, initializeDatabase } = require('../../src/database/db'); 
const { Patient, Report, TrainingData } = require('../../src/database/models');
const { generateToken } = require('../../src/utils/authUtils');

let server;
let authToken;
let testPatientId;
let testReportId;
let testCorrectionId;

describe('Training Data Integration Tests', () => {

  beforeAll(async () => {
    try {
        // REMOVE explicit DB initialization - Rely on global setup
        // await dbUtils.initializeDatabase({ sync: true }); 
        // console.log('Database initialized for training-data.test.js');

        // Verify models are loaded (simple check)
        if (!Patient) {
            throw new Error('Patient model not loaded correctly.');
        }

        server = app.listen(0); 
        authToken = generateToken({ id: 1, role: 'admin' });

        // Create test data (assuming DB is ready from global setup)
        const patient = await Patient.create({ 
            firstName: 'Test', 
            lastName: 'Patient', 
            dateOfBirth: '1990-01-01' 
        });
        testPatientId = patient.id;

        const report = await Report.create({ 
            type: 'Integration Test', 
            patientId: testPatientId, 
            facilityId: 'INT_TEST',
            facility: 'Integration Facility',
            reportDate: new Date(),
            originalFilename: 'integration.txt',
            fileChecksum: 'checksum123', 
            processingStatus: 'completed'
        });
        testReportId = report.id;
    } catch (error) {
        console.error("Error in training-data.test.js beforeAll:", error);
        throw error; 
    }
  });

  afterAll(async () => {
    try {
        // Cleanup test data
        await TrainingData.destroy({ where: { reportId: testReportId } });
        await Report.destroy({ where: { id: testReportId } });
        await Patient.destroy({ where: { id: testPatientId } });
        
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        // REMOVE explicit DB close - Rely on global teardown
        // await sequelize.close(); 
    } catch(error) {
        console.error("Error in training-data.test.js afterAll:", error);
    }
  });

  describe('Training Data Integration Tests', () => {
    describe('Complete Training Data Workflow', () => {
      it('should process a complete training data workflow', async () => {
        // 1. Submit initial training data
        const initialData = {
          reportId: testReportId,
          fieldName: 'diagnosis',
          originalText: 'Initial Diag',
          correctedText: 'Corrected Diag',
          confidenceScore: 0.95
        };
        const submitRes = await request(server)
          .post('/api/training-data')
          .set('Authorization', `Bearer ${authToken}`)
          .send(initialData);
        expect(submitRes.statusCode).toBe(201);
        expect(submitRes.body.data).toHaveProperty('id');
        const trainingDataId = submitRes.body.data.id;

        // 2. Retrieve the data
        const retrieveRes = await request(server)
          .get(`/api/training-data/${trainingDataId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(retrieveRes.statusCode).toBe(200);
        expect(retrieveRes.body.data.correctedText).toBe('Corrected Diag');

        // 3. Submit a correction (update)
        const correctionData = {
          correctedText: 'Final Corrected Diag',
          confidenceScore: 0.99
        };
        const updateRes = await request(server)
          .put(`/api/training-data/${trainingDataId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(correctionData);
        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.body.data.correctedText).toBe('Final Corrected Diag');

        // 4. Retrieve updated data
        const finalRetrieveRes = await request(server)
          .get(`/api/training-data/${trainingDataId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(finalRetrieveRes.statusCode).toBe(200);
        expect(finalRetrieveRes.body.data.correctedText).toBe('Final Corrected Diag');

        // 5. Delete the data
        const deleteRes = await request(server)
          .delete(`/api/training-data/${trainingDataId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(deleteRes.statusCode).toBe(204);

        // 6. Verify deletion
        const verifyDeleteRes = await request(server)
          .get(`/api/training-data/${trainingDataId}`)
          .set('Authorization', `Bearer ${authToken}`);
        expect(verifyDeleteRes.statusCode).toBe(404);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid data gracefully', async () => {
        const invalidData = {
          reportId: testReportId,
          fieldName: 'test_field',
          // Missing originalText, correctedText, confidenceScore
        };
        const res = await request(server)
          .post('/api/training-data')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);
        expect(res.statusCode).toBe(400); // Expect validation error
      });

      it('should handle unauthorized access', async () => {
        const res = await request(server)
          .get('/api/training-data'); // No auth token
        expect(res.statusCode).toBe(401); // Expect unauthorized
      });
    });

    describe('Performance', () => {
      it('should handle batch operations efficiently', async () => {
        const batchItems = Array.from({ length: 10 }, (_, i) => ({
          reportId: testReportId,
          fieldName: `batch_field_${i}`,
          originalText: `Batch Original ${i}`,
          correctedText: `Batch Corrected ${i}`,
          confidenceScore: 0.8 + i / 100
        }));
        const res = await request(server)
          .post('/api/training-data/batch')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ items: batchItems });
        expect(res.statusCode).toBe(201);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBe(10);
      });
    });
  });
}); 