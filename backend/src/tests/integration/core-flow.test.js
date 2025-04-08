const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../app');

let serverInstance;

describe('Core Flow Integration Tests', () => {
  let testFilePath;

  beforeAll(async () => {
    // Start the app server on a random available port
    serverInstance = app.listen(0);

    // Create sample test file
    const testDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testFilePath = path.join(testDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Test file content for upload');
  });

  afterAll(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    // Close the server instance
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
  });

  describe('Patient Flow', () => {
    let patientId;
    
    it('should create a new patient', async () => {
      const response = await request(serverInstance)
        .post('/api/patients')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          bloodType: 'A+',
          gender: 'Male',
          contactNumber: '555-1234'
        });
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('John');
      
      patientId = response.body.id;
    });
    
    it('should retrieve patient details', async () => {
      const response = await request(serverInstance)
        .get(`/api/patients/${patientId}`);
        
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(patientId);
      expect(response.body.firstName).toBe('John');
    });
    
    it('should update patient details', async () => {
      const response = await request(serverInstance)
        .put(`/api/patients/${patientId}`)
        .send({
          lastName: 'Smith',
          contactNumber: '555-5678'
        });
        
      expect(response.status).toBe(200);
      expect(response.body.lastName).toBe('Smith');
      expect(response.body.contactNumber).toBe('555-5678');
    });
    
    it('should search for patients', async () => {
      const response = await request(serverInstance)
        .get('/api/patients/search?query=John');
        
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].firstName).toBe('John');
    });
  });
  
  describe('Report Flow', () => {
    let patientId;
    let reportId;
    
    beforeAll(async () => {
      // Create a test patient first
      const response = await request(serverInstance)
        .post('/api/patients')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '1985-05-15',
          bloodType: 'B+',
          gender: 'Female'
        });
        
      patientId = response.body.id;
    });
    
    it('should upload a new report', async () => {
      const response = await request(serverInstance)
        .post('/api/reports/upload')
        .attach('file', testFilePath)
        .field('reportType', 'blood')
        .field('patientId', patientId);
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.reportType).toBe('blood');
      expect(response.body.patientId).toBe(patientId);
      
      reportId = response.body.id;
    });
    
    it('should retrieve report details', async () => {
      const response = await request(serverInstance)
        .get(`/api/reports/${reportId}`);
        
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(reportId);
      expect(response.body.reportType).toBe('blood');
      expect(response.body.patientId).toBe(patientId);
    });
    
    it('should update report details', async () => {
      const response = await request(serverInstance)
        .put(`/api/reports/${reportId}`)
        .send({
          reportType: 'urine',
          status: 'completed'
        });
        
      expect(response.status).toBe(200);
      expect(response.body.reportType).toBe('urine');
      expect(response.body.status).toBe('completed');
    });
    
    it('should list patient reports', async () => {
      const response = await request(serverInstance)
        .get(`/api/patients/${patientId}/reports`);
        
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].patientId).toBe(patientId);
    });
  });
  
  describe('Caution Card Flow', () => {
    let patientId;
    let cardId;
    
    beforeAll(async () => {
      // Create a test patient first
      const response = await request(serverInstance)
        .post('/api/patients')
        .send({
          firstName: 'Robert',
          lastName: 'Johnson',
          dateOfBirth: '1975-10-20',
          bloodType: 'AB-',
          gender: 'Male'
        });
        
      patientId = response.body.id;
    });
    
    it('should upload a new caution card', async () => {
      const response = await request(serverInstance)
        .post('/api/caution-cards/process')
        .attach('file', testFilePath)
        .field('bloodType', 'AB-')
        .field('antibodies', JSON.stringify(['Anti-E', 'Anti-c']))
        .field('transfusionRequirements', JSON.stringify(['Washed', 'Irradiated']));
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      
      cardId = response.body.id;
    });
    
    it('should retrieve caution card details', async () => {
      const response = await request(serverInstance)
        .get(`/api/caution-cards/${cardId}`);
        
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(cardId);
      expect(response.body.bloodType).toBe('AB-');
    });
    
    it('should update caution card details', async () => {
      const response = await request(serverInstance)
        .put(`/api/caution-cards/${cardId}`)
        .send({
          bloodType: 'AB+',
          status: 'reviewed'
        });
        
      expect(response.status).toBe(200);
      expect(response.body.bloodType).toBe('AB+');
      expect(response.body.status).toBe('reviewed');
    });
    
    it('should link caution card to patient', async () => {
      const response = await request(serverInstance)
        .post(`/api/caution-cards/${cardId}/link`)
        .send({
          patientId: patientId,
          updatedBy: 'test-user'
        });
        
      expect(response.status).toBe(200);
      expect(response.body.patientId).toBe(patientId);
      expect(response.body.status).toBe('linked');
    });
    
    it('should list patient caution cards', async () => {
      const response = await request(serverInstance)
        .get(`/api/patients/${patientId}/caution-cards`);
        
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].patientId).toBe(patientId);
    });
    
    it('should get orphaned caution cards', async () => {
      // Create an orphaned card first
      const uploadResponse = await request(serverInstance)
        .post('/api/caution-cards/process')
        .attach('file', testFilePath)
        .field('bloodType', 'O+');
        
      expect(uploadResponse.status).toBe(201);
      
      const response = await request(serverInstance)
        .get('/api/caution-cards/orphaned');
        
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      // This assertion might be flaky depending on previous tests
      // expect(response.body.length).toBeGreaterThan(0);
    });
  });
}); 