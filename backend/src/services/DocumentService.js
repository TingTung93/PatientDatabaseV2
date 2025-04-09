import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import process from 'process';

import AppError from '../errors/AppError.js';
import { processOcr } from '../ocr/ocr_processor.js';
import documentRepository from '../repositories/DocumentRepository.js';
import logger from '../utils/logger.js';

class DocumentService {
  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
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
   * @param {string | null} [patientId=null] Optional Patient ID
   * @returns {Promise<Object>} Created document
   */
  async uploadDocument(file, patientId = null) {
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
        path: filePath,
        ocr_status: 'pending'
      });

      // Start OCR processing
      this.processDocumentOcr(document.id).catch(error => {
        logger.error(`OCR processing error for document ${document.id}:`, error);
      });

      return document;
    } catch (error) {
      logger.error(`Failed to upload document ${file.originalname}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to upload document', 500, error.message);
    }
  }

  /**
   * Process document with OCR
   * @param {string} documentId Document ID
   * @returns {Promise<void>}
   */
  async processDocumentOcr(documentId) {
    let documentData;
    try {
      documentData = await documentRepository.getDocumentWithFile(documentId);
      if (!documentData || !documentData.document || !documentData.document.path) {
        throw new Error(`Document or path not found for ID: ${documentId}`);
      }

      logger.info(`Starting OCR for document ${documentId} at path ${documentData.document.path}`);
      
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
      logger.info(`OCR completed for document ${documentId}`);
    } catch (error) {
      logger.error(`OCR processing failed for document ${documentId}:`, error);
      await documentRepository.updateOcrStatus(
        documentId,
        'failed',
        null,
        error.message
      ).catch(updateError => {
        logger.error(`Failed to update OCR status to 'failed' for document ${documentId}:`, updateError);
      });
    }
  }

  /**
   * Get document stream for download
   * @param {string} documentId Document ID
   * @returns {Promise<Object>} Document stream and metadata
   */
  async getDocumentStream(documentId) {
    const documentData = await documentRepository.getDocumentWithFile(documentId);
    if (!documentData || !documentData.document) {
      throw new AppError('Document not found', 404);
    }
    const document = documentData.document;
    
    // Ensure the file exists before creating a stream
    try {
      await fs.access(document.path);
    } catch {
      logger.error(`File not found for document ${documentId} at path ${document.path}`);
      throw new AppError('Document file not found on server', 404);
    }

    const fsStream = await import('fs');
    
    return {
      stream: fsStream.createReadStream(document.path),
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
    if (!documentData || !documentData.document) {
      throw new AppError('Document not found', 404);
    }
    const document = documentData.document;
    
    const downloadUrl = `/api/v1/documents/${documentId}/download`;

    if (document.mime_type && document.mime_type.startsWith('image/')) {
      return {
        type: 'image',
        url: downloadUrl,
        ocrText: document.ocr_text
      };
    }

    if (document.mime_type === 'application/pdf') {
      return {
        type: 'pdf',
        url: downloadUrl,
        ocrText: document.ocr_text
      };
    }

    return {
      type: 'other',
      url: downloadUrl,
      ocrText: document.ocr_text
    };
  }

  /**
   * Get documents for a patient
   * @param {string} patientId Patient ID
   * @returns {Promise<Array>} Array of documents
   */
  async getPatientDocuments(patientId) {
    if (!patientId) {
      throw new AppError('Patient ID is required', 400);
    }
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
      id: document.id,
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
    const document = await documentRepository.findById(documentId);
    if (!document) {
      logger.warn(`Attempted to delete non-existent document: ${documentId}`);
      return;
    }
    
    try {
      if (document.path) {
        await fs.unlink(document.path);
        logger.info(`Deleted file for document ${documentId} at path ${document.path}`);
      }
    } catch (err) {
      logger.error(`Failed to delete file for document ${documentId} at path ${document.path}:`, err);
    }
    
    await documentRepository.deleteDocument(documentId);
    logger.info(`Deleted document record ${documentId}`);
  }

  /**
   * Search documents by OCR text
   * @param {string} patientId Patient ID
   * @param {string} searchText Search text
   * @returns {Promise<Array>} Matching documents
   */
  async searchDocuments(patientId, searchText) {
    if (!patientId) {
      throw new AppError('Patient ID is required for searching documents', 400);
    }
    if (!searchText || typeof searchText !== 'string' || searchText.trim().length < 2) {
      throw new AppError('Search text must be at least 2 characters long', 400);
    }
    return documentRepository.searchByOcrText(patientId, searchText.trim());
  }
}

const documentService = new DocumentService();
export default documentService;