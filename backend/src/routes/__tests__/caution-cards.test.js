const request = require('supertest');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { db } = require('../../database/init');
const { validateCautionCard, validateCautionCardUpdate, validateCautionCardFile } = require('../../middleware/validation');

// Mock multer
jest.mock('multer', () => {
  return () => {
    return {
      single: () => (req, res, next) => {
        next();
      }
    };
  };
});

// Mock WebSocket
const mockEmit = jest.fn();
jest.mock('../../services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: () => ({
      emit: mockEmit
    })
  }
}));

describe('Caution Cards Routes', () => {
  let app;
  let testFile;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Mock file upload directory
    const uploadDir = path.join(process.cwd(), 'data', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Create a test file
    testFile = path.join(uploadDir, 'test.jpg');
    await fs.writeFile(testFile, 'test content');
    
    // Import routes
    const cautionCardsRouter = require('../caution-cards');
    app.use('/api/caution-cards', cautionCardsRouter);
  });

  afterAll(async () => {
    // Clean up test file
    try {
      await fs.unlink(testFile);
    } catch (error) {
      console.error('Error cleaning up test file:', error);
    }
  });

  beforeEach(() => {
    // Clear database
    db.prepare('DELETE FROM caution_cards').run();
    // Clear mocks
    mockEmit.mockClear();
  });

  describe('GET /api/caution-cards', () => {
    test('should return empty array when no cards exist', async () => {
      const response = await request(app).get('/api/caution-cards');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all caution cards', async () => {
      // Insert test data
      const stmt = db.prepare(`
        INSERT INTO caution_cards (
          file_path, file_name, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(testFile, 'test.jpg', 1024, 'image/jpeg', 'processing_ocr');

      const response = await request(app).get('/api/caution-cards');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        file_name: 'test.jpg',
        mime_type: 'image/jpeg',
        status: 'processing_ocr'
      });
    });
  });

  describe('GET /api/caution-cards/:id', () => {
    test('should return 404 for non-existent card', async () => {
      const response = await request(app).get('/api/caution-cards/999');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Caution card not found' });
    });

    test('should return card by id', async () => {
      // Insert test data
      const stmt = db.prepare(`
        INSERT INTO caution_cards (
          file_path, file_name, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(testFile, 'test.jpg', 1024, 'image/jpeg', 'processing_ocr');
      const cardId = result.lastInsertRowid;

      const response = await request(app).get(`/api/caution-cards/${cardId}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: cardId,
        file_name: 'test.jpg',
        mime_type: 'image/jpeg',
        status: 'processing_ocr'
      });
    });
  });

  describe('POST /api/caution-cards/process', () => {
    test('should validate file metadata', async () => {
      const response = await request(app)
        .post('/api/caution-cards/process')
        .attach('file', testFile);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        file_name: expect.any(String),
        mime_type: 'image/jpeg',
        status: 'processing_ocr'
      });
      expect(mockEmit).toHaveBeenCalledWith('caution-card-uploaded', expect.any(Object));
    });

    test('should reject invalid file type', async () => {
      const invalidFile = path.join(process.cwd(), 'data', 'uploads', 'test.txt');
      await fs.writeFile(invalidFile, 'invalid content');

      const response = await request(app)
        .post('/api/caution-cards/process')
        .attach('file', invalidFile);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid file type');

      await fs.unlink(invalidFile);
    });

    test('should handle file upload errors', async () => {
      const response = await request(app)
        .post('/api/caution-cards/process')
        .attach('file', 'nonexistent.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/caution-cards/:id', () => {
    test('should validate update data', async () => {
      // Insert test data
      const stmt = db.prepare(`
        INSERT INTO caution_cards (
          file_path, file_name, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(testFile, 'test.jpg', 1024, 'image/jpeg', 'processing_ocr');
      const cardId = result.lastInsertRowid;

      const updateData = {
        status: 'pending_review',
        reviewedData: {
          patientName: 'John Doe'
        }
      };

      const response = await request(app)
        .put(`/api/caution-cards/${cardId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: cardId,
        status: 'pending_review',
        reviewed_data: JSON.stringify(updateData.reviewedData)
      });
      expect(mockEmit).toHaveBeenCalledWith('caution-card-updated', expect.any(Object));
    });

    test('should reject invalid update data', async () => {
      // Insert test data
      const stmt = db.prepare(`
        INSERT INTO caution_cards (
          file_path, file_name, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(testFile, 'test.jpg', 1024, 'image/jpeg', 'processing_ocr');
      const cardId = result.lastInsertRowid;

      const invalidUpdate = {
        status: 'invalid_status',
        reviewedData: {
          // Missing patientName
        }
      };

      const response = await request(app)
        .put(`/api/caution-cards/${cardId}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    test('should return 404 for non-existent card', async () => {
      const response = await request(app)
        .put('/api/caution-cards/999')
        .send({
          status: 'pending_review',
          reviewedData: { patientName: 'John Doe' }
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Caution card not found' });
    });
  });

  describe('DELETE /api/caution-cards/:id', () => {
    test('should delete existing card', async () => {
      // Insert test data
      const stmt = db.prepare(`
        INSERT INTO caution_cards (
          file_path, file_name, file_size, mime_type, status
        ) VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(testFile, 'test.jpg', 1024, 'image/jpeg', 'processing_ocr');
      const cardId = result.lastInsertRowid;

      const response = await request(app)
        .delete(`/api/caution-cards/${cardId}`);

      expect(response.status).toBe(204);
      expect(mockEmit).toHaveBeenCalledWith('caution-card-deleted', { id: cardId });

      // Verify card is deleted
      const card = db.prepare('SELECT * FROM caution_cards WHERE id = ?').get(cardId);
      expect(card).toBeUndefined();
    });

    test('should return 404 for non-existent card', async () => {
      const response = await request(app)
        .delete('/api/caution-cards/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Caution card not found' });
    });
  });
}); 