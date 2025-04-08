const express = require('express');
const request = require('supertest');

const { ApiError, errorHandler } = require('../../middleware/errorHandler');
const validateRequest = require('../../middleware/validateRequest');

// Mock the controller
const mockController = {
  processCard: jest.fn(),
  finalizeCard: jest.fn(),
  getCard: jest.fn(),
  listCards: jest.fn(),
  getSuggestions: jest.fn()
};

// Import the router factory function
const createCautionCardsRouter = require('../cautionCards');

describe('Caution Cards Routes', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new express app for each test
    app = express();
    app.use(express.json());

    // Create and use the router with mock controller
    const cautionCardsRouter = createCautionCardsRouter(mockController);
    app.use('/api/caution-cards', cautionCardsRouter);

    // Add error handler
    app.use(errorHandler);
  });

  describe('POST /api/caution-cards/process', () => {
    it('should process a new caution card', async () => {
      const mockResponse = {
        cardId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'processing_ocr'
      };
      mockController.processCard.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .post('/api/caution-cards/process')
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(202);

      expect(response.body).toEqual({
        status: 'success',
        data: mockResponse
      });
      expect(mockController.processCard).toHaveBeenCalled();
    });

    it('should validate file input', async () => {
      const response = await request(app)
        .post('/api/caution-cards/process')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'No file uploaded or invalid file type.'
      });
    });
  });

  describe('PUT /api/caution-cards/:id/finalize', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should finalize a card by linking to patient', async () => {
      const mockRequest = {
        reviewedData: { name: 'Test Patient' },
        linkedPatientId: '223e4567-e89b-12d3-a456-426614174000',
        isOrphaned: false
      };
      const mockResponse = {
        id: mockCardId,
        status: 'linked',
        linkedPatientId: mockRequest.linkedPatientId,
        reviewedData: mockRequest.reviewedData
      };
      mockController.finalizeCard.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .put(`/api/caution-cards/${mockCardId}/finalize`)
        .send(mockRequest)
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockResponse
      });
      expect(mockController.finalizeCard).toHaveBeenCalledWith(mockCardId, mockRequest);
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .put('/api/caution-cards/invalid-uuid/finalize')
        .send({
          reviewedData: {},
          isOrphaned: true
        })
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors: [
          { message: 'Invalid card ID format (must be UUID)' }
        ]
      });
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .put(`/api/caution-cards/${mockCardId}/finalize`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors: [
          {
            message: 'Invalid value'
          },
          {
            message: 'Reviewed data is required'
          },
          {
            message: 'isOrphaned must be a boolean'
          },
          {
            message: 'linkedPatientId is required when not marking as orphaned'
          }
        ]
      });
    });

    it('should handle non-existent card', async () => {
      mockController.finalizeCard.mockRejectedValueOnce(ApiError.notFound('Caution card not found'));

      const response = await request(app)
        .put(`/api/caution-cards/${mockCardId}/finalize`)
        .send({
          reviewedData: { name: 'Test Patient' },
          isOrphaned: true
        })
        .expect(404);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Caution card not found'
      });
    });
  });

  describe('GET /api/caution-cards/:id', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should return a specific caution card', async () => {
      const mockCard = {
        card: {
          id: mockCardId,
          status: 'linked',
          reviewedData: { name: 'Test Patient' }
        }
      };
      mockController.getCard.mockResolvedValueOnce(mockCard);

      const response = await request(app)
        .get(`/api/caution-cards/${mockCardId}`)
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockCard
      });
      expect(mockController.getCard).toHaveBeenCalledWith(mockCardId);
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/caution-cards/invalid-uuid')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors: [
          { message: 'Invalid card ID format (must be UUID)' }
        ]
      });
    });

    it('should handle non-existent card', async () => {
      mockController.getCard.mockRejectedValueOnce(ApiError.notFound('Caution card not found'));

      const response = await request(app)
        .get(`/api/caution-cards/${mockCardId}`)
        .expect(404);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Caution card not found'
      });
    });
  });

  describe('GET /api/caution-cards', () => {
    it('should list caution cards with pagination', async () => {
      const mockResponse = {
        cards: [
          { id: '123', status: 'linked' }
        ],
        pagination: {
          total: 1,
          offset: 0,
          limit: 10
        }
      };
      mockController.listCards.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .get('/api/caution-cards')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockResponse
      });
      expect(mockController.listCards).toHaveBeenCalledWith({
        status: undefined,
        search: undefined,
        limit: 10,
        offset: 0
      });
    });

    it('should handle status filter', async () => {
      const mockResponse = {
        cards: [
          { id: '123', status: 'linked' }
        ],
        pagination: {
          total: 1,
          offset: 0,
          limit: 10
        }
      };
      mockController.listCards.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .get('/api/caution-cards?status=linked')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockResponse
      });
      expect(mockController.listCards).toHaveBeenCalledWith({
        status: 'linked',
        search: undefined,
        limit: 10,
        offset: 0
      });
    });

    it('should handle search parameters', async () => {
      const mockResponse = {
        cards: [
          { id: '123', status: 'linked' }
        ],
        pagination: {
          total: 1,
          offset: 10,
          limit: 5
        }
      };
      mockController.listCards.mockResolvedValueOnce(mockResponse);

      const response = await request(app)
        .get('/api/caution-cards?search=test&limit=5&offset=10')
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockResponse
      });
      expect(mockController.listCards).toHaveBeenCalledWith({
        status: undefined,
        search: 'test',
        limit: 5,
        offset: 10
      });
    });
  });

  describe('GET /api/caution-cards/:id/suggestions', () => {
    const mockCardId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should return patient suggestions for a card', async () => {
      const mockSuggestions = {
        suggestions: [
          { id: '123', score: 0.9 }
        ]
      };
      mockController.getSuggestions.mockResolvedValueOnce(mockSuggestions);

      const response = await request(app)
        .get(`/api/caution-cards/${mockCardId}/suggestions`)
        .expect(200);

      expect(response.body).toEqual({
        status: 'success',
        data: mockSuggestions
      });
      expect(mockController.getSuggestions).toHaveBeenCalledWith(mockCardId);
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/caution-cards/invalid-uuid/suggestions')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors: [
          { message: 'Invalid card ID format (must be UUID)' }
        ]
      });
    });

    it('should handle non-existent card', async () => {
      mockController.getSuggestions.mockRejectedValueOnce(ApiError.notFound('Caution card not found'));

      const response = await request(app)
        .get(`/api/caution-cards/${mockCardId}/suggestions`)
        .expect(404);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Caution card not found'
      });
    });
  });
});