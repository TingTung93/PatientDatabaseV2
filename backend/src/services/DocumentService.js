const path = require('path');
const fs = require('fs').promises;

const { v4: uuidv4 } = require('uuid');

const config = require('../config/config');
const AppError = require('../errors/AppError');
const { processOcr } = require('../ocr/ocr_processor');
const documentRepository = require('../repositories/DocumentRepository');

class DocumentService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   * @private
   */
  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file and create document record
   * @param {Object} file Express file object
   * @param {string} patientId Patient ID
   * @returns {Promise<Object>} Created document
   */
  async uploadDocument(file, patientId) {
    try {
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExt}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Create document record
      const document = await documentRepository.createDocument({
        patient_id: patientId,
        filename,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: filePath
      });

      // Start OCR processing
      this.processDocumentOcr(document.id).catch(error => {
        console.error('OCR processing error:', error);
      });

      return document;
    } catch (error) {
      throw new AppError('Failed to upload document', 500, error);
    }
  }

  /**
   * Process document with OCR
   * @param {string} documentId Document ID
   * @returns {Promise<void>}
   */
  async processDocumentOcr(documentId) {
    try {
      const documentData = await documentRepository.getDocumentWithFile(documentId);
      
      // Update status to processing
      await documentRepository.updateOcrStatus(documentId, 'processing');

      // Process OCR
      const ocrResult = await processOcr(documentData.document.path);

      // Update document with OCR results
      await documentRepository.updateOcrStatus(
        documentId,
        'completed',
        ocrResult.text
      );
    } catch (error) {
      console.error('OCR processing error:', error);
      await documentRepository.updateOcrStatus(
        documentId,
        'failed',
        null,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get document stream for download
   * @param {string} documentId Document ID
   * @returns {Promise<Object>} Document stream and metadata
   */
  async getDocumentStream(documentId) {
    const documentData = await documentRepository.getDocumentWithFile(documentId);
    const document = documentData.document;
    
    return {
      stream: fs.createReadStream(document.path),
      filename: document.original_filename,
      mimeType: document.mime_type
    };
  }

  /**
   * Get document preview
   * @param {string} documentId Document ID
   * @returns {Promise<Object>} Preview data
   */
  async getDocumentPreview(documentId) {
    const documentData = await documentRepository.getDocumentWithFile(documentId);
    const document = documentData.document;
    
    // For images, return the original file
    if (document.mime_type.startsWith('image/')) {
      return {
        url: `/api/documents/${documentId}/download`,
        ocrText: document.ocr_text
      };
    }

    // For PDFs, could implement PDF preview generation here
    // For now, just return the download URL
    return {
      url: `/api/documents/${documentId}/download`,
      ocrText: document.ocr_text
    };
  }

  /**
   * Get documents for a patient
   * @param {string} patientId Patient ID
   * @returns {Promise<Array>} Array of documents
   */
  async getPatientDocuments(patientId) {
    return documentRepository.getPatientDocuments(patientId);
  }

  /**
   * Get document OCR status
   * @param {string} documentId Document ID
   * @returns {Promise<Object>} OCR status
   */
  async getOcrStatus(documentId) {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    return {
      status: document.ocr_status,
      error: document.ocr_error
    };
  }

  /**
   * Delete document
   * @param {string} documentId Document ID
   * @returns {Promise<void>}
   */
  async deleteDocument(documentId) {
    await documentRepository.deleteDocument(documentId);
  }

  /**
   * Search documents by OCR text
   * @param {string} patientId Patient ID
   * @param {string} searchText Search text
   * @returns {Promise<Array>} Matching documents
   */
  async searchDocuments(patientId, searchText) {
    return documentRepository.searchByOcrText(patientId, searchText);
  }
}

module.exports = new DocumentService();