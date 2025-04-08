const express = require('express');
const request = require('supertest');

const CautionCardController = require('../../controllers/CautionCardController');
const { ApiError } = require('../../middleware/errorHandler');
const validateRequest = require('../../middleware/validateRequest');
const createOrphanedCardsRouter = require('../orphanedCards');

// Mock the CautionCardController
jest.mock('../../controllers/CautionCardController');

describe('Orphaned Cards Routes', () => {
  let app;
  let mockController;

  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());

    // Create a new mock controller instance
    mockController = new CautionCardController();
    const orphanedCardsRouter = createOrphanedCardsRouter(mockController);

    // Register routes
    app.use('/api/orphaned-cards', orphanedCardsRouter);
    app.use((err, req, res, next) => {
      if (err instanceof ApiError) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orphaned-cards', () => {
    it('should list orphaned cards with default pagination', async () => {
      const mockResult = {
        items: [
          {
            id: '123',
            status: 'orphaned',
            reviewedData: { patientName: 'John Doe' },
            createdAt: new Date().toISOString()
          }
        ],
        total: 1,
        page: 1,
        limit: 20
      };

      mockController.listOrphanedCards.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/orphaned-cards')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockResult);
      expect(mockController.listOrphanedCards).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined
      });
    });

    it('should handle pagination and search parameters', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 2,
        limit: 10
      };

      mockController.listOrphanedCards.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/orphaned-cards?page=2&limit=10&search=John')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockResult);
      expect(mockController.listOrphanedCards).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'John'
      });
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/orphaned-cards?page=0&limit=200')
        .expect(400);
    });
  });

  describe('PUT /api/orphaned-cards/:id/link', () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const validPatientId = '123e4567-e89b-12d3-a456-426614174001';

    it('should link an orphaned card to a patient', async () => {
      const mockResult = {
        id: validId,
        status: 'linked',
        linkedPatientId: validPatientId
      };

      mockController.linkOrphanedCard.mockResolvedValue(mockResult);

      const response = await request(app)
        .put(`/api/orphaned-cards/${validId}/link`)
        .send({ patientId: validPatientId })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockResult);
      expect(mockController.linkOrphanedCard).toHaveBeenCalledWith(
        validId,
        validPatientId
      );
    });

    it('should validate card ID format', async () => {
      await request(app)
        .put('/api/orphaned-cards/invalid-id/link')
        .send({ patientId: validPatientId })
        .expect(400);
    });

    it('should validate patient ID format', async () => {
      await request(app)
        .put(`/api/orphaned-cards/${validId}/link`)
        .send({ patientId: 'invalid-id' })
        .expect(400);
    });

    it('should handle not found error', async () => {
      const error = new ApiError('Orphaned card not found', 404);
      mockController.linkOrphanedCard.mockRejectedValue(error);

      await request(app)
        .put(`/api/orphaned-cards/${validId}/link`)
        .send({ patientId: validPatientId })
        .expect(404);
    });
  });
});