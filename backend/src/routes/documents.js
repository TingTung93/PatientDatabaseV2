const express = require('express');
const router = express.Router();
const multer = require('multer');

const AppError = require('../errors/AppError');
const documentService = require('../services/DocumentService');
const { asyncHandler } = require('../utils/asyncHandler');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only images and PDFs are allowed.', 400));
    }
  }
});

// Upload document
router.post('/patients/:patientId/documents',
  upload.single('document'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const document = await documentService.uploadDocument(req.file, req.params.patientId);
    res.status(201).json(document);
  })
);

// Get patient documents
router.get('/patients/:patientId/documents',
  asyncHandler(async (req, res) => {
    const documents = await documentService.getPatientDocuments(req.params.patientId);
    res.json(documents);
  })
);

// Get document OCR status
router.get('/documents/:documentId/ocr-status',
  asyncHandler(async (req, res) => {
    const status = await documentService.getOcrStatus(req.params.documentId);
    res.json(status);
  })
);

// Download document
router.get('/documents/:documentId/download',
  asyncHandler(async (req, res) => {
    const { stream, filename, mimeType } = await documentService.getDocumentStream(req.params.documentId);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    stream.pipe(res);
  })
);

// Get document preview
router.get('/documents/:documentId/preview',
  asyncHandler(async (req, res) => {
    const preview = await documentService.getDocumentPreview(req.params.documentId);
    res.json(preview);
  })
);

// Delete document
router.delete('/documents/:documentId',
  asyncHandler(async (req, res) => {
    await documentService.deleteDocument(req.params.documentId);
    res.status(204).end();
  })
);

// Search documents
router.get('/patients/:patientId/documents/search',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q) {
      throw new AppError('Search query is required', 400);
    }

    const documents = await documentService.searchDocuments(req.params.patientId, q);
    res.json(documents);
  })
);

module.exports = router;