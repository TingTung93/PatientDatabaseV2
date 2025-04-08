import request from 'supertest';
import express from 'express';
import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import ocrRouter from '../ocr';

// Mock the database
jest.mock('../../database/db', () => ({
  getPatientInternalId: jest.fn(),
  insertReviewItem: jest.fn(),
  insertFileAttachment: jest.fn(),
  linkAttachmentToReview: jest.fn()
}));

describe('OCR Routes - GET Endpoints', () => {
  let app;

  beforeEach(() => {
    app = express();
    // Mock repositories middleware
    app.use((req, res, next) => {
      req.repositories = {
        patient: {
          findByImageId: jest.fn()
        }
      };
      next();
    });
    app.use('/api/ocr', ocrRouter);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/ocr')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: [],
        total: 0
      });
    });

    test('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/ocr')
        .query({ 
          page: 2, 
          limit: 20,
          view: 'detailed'
        });

      expect(response.status).toBe(200);
      // Pagination parameters should not affect empty result
      expect(response.body).toEqual({
        data: [],
        total: 0
      });
    });
  });

  describe('GET /orphaned', () => {
    test('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/ocr/orphaned');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /results/:imageId', () => {
    test('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get('/api/ocr/results/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'No OCR results found for this image'
      });
    });

    test('should return patient data and OCR info for existing image', async () => {
      // Mock patient repository response
      const mockPatient = {
        id: 123,
        name: 'John Doe',
        cautionCardData: {
          field1: 'value1',
          field2: 'value2'
        },
        ocrConfidence: 'high'
      };

      let patientRepo;
      app.use((req, res, next) => {
        patientRepo = req.repositories.patient;
        patientRepo.findByImageId.mockResolvedValueOnce(mockPatient);
        next();
      });

      const response = await request(app)
        .get('/api/ocr/results/123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          patient: mockPatient,
          cautionCardData: mockPatient.cautionCardData,
          ocrConfidence: mockPatient.ocrConfidence
        }
      });
      expect(patientRepo.findByImageId).toHaveBeenCalledWith('123');
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      let patientRepo;
      app.use((req, res, next) => {
        patientRepo = req.repositories.patient;
        patientRepo.findByImageId.mockRejectedValueOnce(
          new Error('Database connection failed')
        );
        next();
      });

      const response = await request(app)
        .get('/api/ocr/results/123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Failed to retrieve OCR results',
        error: 'Database connection failed'
      });
    });
  });
});