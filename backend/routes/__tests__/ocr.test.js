import request from 'supertest';
import express from 'express';
import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import ocrRouter from '../ocr';
import { Buffer } from 'buffer';
import db from '../../database/db';

// Mock the database
jest.mock('../../database/db', () => ({
  getPatientInternalId: jest.fn(),
  insertReviewItem: jest.fn(),
  insertFileAttachment: jest.fn(),
  linkAttachmentToReview: jest.fn()
}));

// Mock the file system
jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));


describe('OCR Routes - Upload Validation', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use('/api/ocr', ocrRouter);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('should reject request without file', async () => {
    const response = await request(app)
      .post('/api/ocr/process')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: 'error',
      message: 'No file uploaded'
    });
  });

  test('should reject invalid file types', async () => {
    const response = await request(app)
      .post('/api/ocr/process')
      .attach('file', Buffer.from('fake pdf'), {
        filename: 'test.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid file type');
  });

  test('should accept valid image types', async () => {
    // Mock successful Python process
    const mockSpawn = jest.requireMock('child_process').spawn;
    mockSpawn.mockImplementation(() => ({
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: (event, callback) => {
        if (event === 'close') callback(0);
      }
    }));

    const response = await request(app)
      .post('/api/ocr/process')
      .attach('file', Buffer.from('fake image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(200);
  });
});

describe('OCR Routes - Process Integration', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use('/api/ocr', ocrRouter);
    jest.clearAllMocks();
  });

  test('should handle OCR process success with existing patient', async () => {
    // Mock database responses
    db.getPatientInternalId.mockResolvedValue(123);
    db.insertReviewItem.mockResolvedValue(456);
    db.insertFileAttachment.mockResolvedValue(789);
    db.linkAttachmentToReview.mockResolvedValue();

    // Mock Python process success
    const mockSpawn = jest.requireMock('child_process').spawn;
    mockSpawn.mockImplementation(() => ({
      stdout: {
        on: (event, callback) => {
          if (event === 'data') callback(JSON.stringify({
            data: {
              patient_info: {
                mrn: '12345'
              }
            }
          }));
        }
      },
      stderr: { on: jest.fn() },
      on: (event, callback) => {
        if (event === 'close') callback(0);
      }
    }));

    const response = await request(app)
      .post('/api/ocr/process')
      .attach('file', Buffer.from('fake image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reviewItemId', 456);
    expect(response.body).toHaveProperty('attachmentId', 789);
    expect(db.getPatientInternalId).toHaveBeenCalledWith('12345');
  });

  test('should handle OCR process with orphaned patient', async () => {
    // Mock database responses for orphaned case
    db.getPatientInternalId.mockResolvedValue(null);
    db.insertReviewItem.mockResolvedValue(456);
    db.insertFileAttachment.mockResolvedValue(789);
    db.linkAttachmentToReview.mockResolvedValue();

    // Mock Python process success
    const mockSpawn = jest.requireMock('child_process').spawn;
    mockSpawn.mockImplementation(() => ({
      stdout: {
        on: (event, callback) => {
          if (event === 'data') callback(JSON.stringify({
            data: {
              patient_info: {
                mrn: '12345'
              }
            }
          }));
        }
      },
      stderr: { on: jest.fn() },
      on: (event, callback) => {
        if (event === 'close') callback(0);
      }
    }));

    const response = await request(app)
      .post('/api/ocr/process')
      .attach('file', Buffer.from('fake image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(200);
    expect(response.body.isOrphaned).toBe(true);
    expect(response.body).toHaveProperty('reviewItemId', 456);
    expect(response.body).toHaveProperty('attachmentId', 789);
  });

  test('should handle OCR process failure', async () => {
    // Mock Python process failure
    const mockSpawn = jest.requireMock('child_process').spawn;
    mockSpawn.mockImplementation(() => ({
      stdout: { on: jest.fn() },
      stderr: {
        on: (event, callback) => {
          if (event === 'data') callback('OCR processing failed');
        }
      },
      on: (event, callback) => {
        if (event === 'close') callback(1);
      }
    }));

    const response = await request(app)
      .post('/api/ocr/process')
      .attach('file', Buffer.from('fake image'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error');
  });
});