const request = require('supertest');
const app = require('../../server');
const db = require('../../db');
const { generateToken } = require('../../utils/auth');

// Mock database for testing
jest.mock('../../db', () => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn()
}));

describe('Training Routes', () => {
  let token;
  const mockUser = { id: 1, username: 'testuser' };
  
  beforeEach(() => {
    // Generate a valid token for testing
    token = generateToken(mockUser);
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('POST /training/caution-cards/:id/corrections', () => {
    it('should submit a correction successfully', async () => {
      // Mock database response
      db.run.mockResolvedValueOnce({ lastID: 1 });
      db.run.mockResolvedValueOnce({ changes: 1 });
      
      const response = await request(app)
        .post('/training/caution-cards/1/corrections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          field_name: 'patient_name',
          original_ocr_text: 'John Doe',
          corrected_text: 'John Smith',
          confidence_score: 0.85
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Correction submitted successfully');
      expect(response.body).toHaveProperty('id', 1);
      
      // Verify database calls
      expect(db.run).toHaveBeenCalledTimes(2);
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/training/caution-cards/1/corrections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          field_name: 'patient_name',
          // Missing original_ocr_text and corrected_text
          confidence_score: 0.85
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .post('/training/caution-cards/1/corrections')
        .send({
          field_name: 'patient_name',
          original_ocr_text: 'John Doe',
          corrected_text: 'John Smith',
          confidence_score: 0.85
        });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /training/training-data', () => {
    it('should return training data with filters', async () => {
      // Mock database response
      const mockData = [
        { id: 1, field_name: 'patient_name', original_ocr_text: 'John Doe', corrected_text: 'John Smith' }
      ];
      db.all.mockResolvedValueOnce(mockData);
      
      const response = await request(app)
        .get('/training/training-data')
        .set('Authorization', `Bearer ${token}`)
        .query({ field_name: 'patient_name', limit: 10, offset: 0 });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      
      // Verify database call
      expect(db.all).toHaveBeenCalledTimes(1);
    });
    
    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .get('/training/training-data');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /training/training-data/analytics', () => {
    it('should return training analytics', async () => {
      // Mock database responses
      const mockFieldAnalytics = [
        { field_name: 'patient_name', total_corrections: 10, error_rate: 0.3, avg_confidence: 0.85 }
      ];
      const mockErrorPatterns = [
        { pattern_type: 'patient_name', original_text: 'John Doe', corrected_text: 'John Smith', frequency: 5 }
      ];
      
      db.all.mockResolvedValueOnce(mockFieldAnalytics);
      db.all.mockResolvedValueOnce(mockErrorPatterns);
      
      const response = await request(app)
        .get('/training/training-data/analytics')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('field_analytics', mockFieldAnalytics);
      expect(response.body).toHaveProperty('common_errors', mockErrorPatterns);
      
      // Verify database calls
      expect(db.all).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('GET /training/training-mode', () => {
    it('should return training mode status', async () => {
      // Mock database response
      db.get.mockResolvedValueOnce({ is_training_mode: true });
      
      const response = await request(app)
        .get('/training/training-mode')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('is_training_mode', true);
      
      // Verify database call
      expect(db.get).toHaveBeenCalledTimes(1);
    });
    
    it('should return false when no settings exist', async () => {
      // Mock database response
      db.get.mockResolvedValueOnce(null);
      
      const response = await request(app)
        .get('/training/training-mode')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('is_training_mode', false);
    });
  });
  
  describe('POST /training/training-mode/toggle', () => {
    it('should toggle training mode', async () => {
      // Mock database response
      db.run.mockResolvedValueOnce({ changes: 1 });
      
      const response = await request(app)
        .post('/training/training-mode/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_training_mode: true });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('is_training_mode', true);
      
      // Verify database call
      expect(db.run).toHaveBeenCalledTimes(1);
    });
  });
}); 