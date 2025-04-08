const DocumentService = require('../DocumentService');
const DocumentRepository = require('../../repositories/DocumentRepository'); // Assuming DocumentRepository exists
const PatientRepository = require('../../repositories/PatientRepository'); // If linking documents to patients

const fs = require('fs').promises; // For mocking file system operations if service uses them
const path = require('path');

const AppError = require('../../errors/AppError');
const logger = require('../../utils/logger');

// --- Mock Dependencies ---
jest.mock('../../repositories/DocumentRepository');
jest.mock('../../repositories/PatientRepository');
jest.mock('fs', () => ({ // Mock fs module
    promises: {
        unlink: jest.fn(), // Mock unlink for deletion
        // Mock other fs.promises methods if used (e.g., readFile, writeFile)
    }
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('DocumentService', () => {
  let documentServiceInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    DocumentRepository.create.mockReset();
    DocumentRepository.findByPatientId.mockReset(); // Assuming this method exists
    DocumentRepository.findById.mockReset();
    DocumentRepository.delete.mockReset();
    PatientRepository.findById.mockReset();
    fs.unlink.mockReset(); // Reset fs mocks

    // Re-require the service or use the exported singleton
    documentServiceInstance = require('../DocumentService');
  });

  // --- uploadDocument Tests (Example - depends heavily on service implementation) ---
  describe('uploadDocument', () => {
    const mockFile = {
      originalname: 'report.pdf',
      path: 'uploads/temp/report.pdf', // Temporary path from multer
      mimetype: 'application/pdf',
      size: 10240,
    };
    const patientId = 'patient-doc-1';
    const mockPatient = { id: patientId };
    const finalPath = path.join('uploads', 'patient-docs', patientId, mockFile.originalname); // Example final path
    const createdDocument = {
        id: 'doc-123',
        patientId: patientId,
        filePath: finalPath,
        fileName: mockFile.originalname,
        fileType: mockFile.mimetype,
        uploadDate: new Date(),
    };

    // This test assumes the service moves the file and creates a DB record.
    // Actual implementation might differ (e.g., storing in cloud, different path structure).
    it('should create a document record and potentially move the file', async () => {
        // Arrange
        PatientRepository.findById.mockResolvedValue(mockPatient); // Patient exists
        // Mock file moving logic if service does it (e.g., fs.rename or stream piping)
        // For simplicity, assume path is stored directly or handled elsewhere
        DocumentRepository.create.mockResolvedValue(createdDocument);

        // Act
        // Adjust arguments based on actual service method signature
        const result = await documentServiceInstance.uploadDocument(patientId, mockFile);

        // Assert
        expect(PatientRepository.findById).toHaveBeenCalledWith(patientId);
        // Add expectations for file moving/renaming mocks if applicable
        expect(DocumentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            patientId: patientId,
            // filePath: finalPath, // Verify path based on service logic
            fileName: mockFile.originalname,
            fileType: mockFile.mimetype,
        }));
        expect(result).toEqual(createdDocument); // Or whatever the service returns
        expect(logger.info).toHaveBeenCalledWith(`Uploading document ${mockFile.originalname} for patient ${patientId}`);
    });

    it('should throw AppError if patient not found', async () => {
        // Arrange
        PatientRepository.findById.mockResolvedValue(null); // Patient doesn't exist

        // Act & Assert
        await expect(documentServiceInstance.uploadDocument(patientId, mockFile))
            .rejects.toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

        expect(DocumentRepository.create).not.toHaveBeenCalled();
        // Add expectations that file operations didn't happen
    });

     it('should handle errors during document record creation', async () => {
        // Arrange
        const dbError = new Error('DB Create Failed');
        PatientRepository.findById.mockResolvedValue(mockPatient);
        DocumentRepository.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(documentServiceInstance.uploadDocument(patientId, mockFile))
            .rejects.toThrow('Failed to save document information.'); // Adjust error message

        expect(logger.error).toHaveBeenCalledWith('Error creating document record:', dbError);
        // Consider if the uploaded file should be cleaned up here
        // expect(fs.unlink).toHaveBeenCalledWith(mockFile.path); // If service cleans up on DB error
    });

    // Add tests for file operation errors if the service handles file moving/copying
  });

  // --- getDocumentsForPatient Tests ---
  describe('getDocumentsForPatient', () => {
     it('should retrieve documents for a patient using the repository', async () => {
        // Arrange
        const patientId = 'patient-docs-2';
        const mockDocuments = [{ id: 'doc-a', fileName: 'a.pdf' }, { id: 'doc-b', fileName: 'b.jpg' }];
        PatientRepository.findById.mockResolvedValue({ id: patientId }); // Ensure patient exists
        DocumentRepository.findByPatientId.mockResolvedValue(mockDocuments);

        // Act
        const result = await documentServiceInstance.getDocumentsForPatient(patientId);

        // Assert
        expect(PatientRepository.findById).toHaveBeenCalledWith(patientId);
        expect(DocumentRepository.findByPatientId).toHaveBeenCalledWith(patientId);
        expect(result).toEqual(mockDocuments);
        expect(logger.debug).toHaveBeenCalledWith(`Fetching documents for patient ID: ${patientId}`);
    });

     it('should throw AppError if patient not found', async () => {
        // Arrange
        const patientId = 'patient-not-found';
        PatientRepository.findById.mockResolvedValue(null); // Patient doesn't exist

        // Act & Assert
        await expect(documentServiceInstance.getDocumentsForPatient(patientId))
            .rejects.toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

        expect(DocumentRepository.findByPatientId).not.toHaveBeenCalled();
    });

     it('should handle errors from the repository', async () => {
        // Arrange
        const patientId = 'patient-error';
        const dbError = new Error('DB Find Failed');
        PatientRepository.findById.mockResolvedValue({ id: patientId });
        DocumentRepository.findByPatientId.mockRejectedValue(dbError);

        // Act & Assert
        await expect(documentServiceInstance.getDocumentsForPatient(patientId))
            .rejects.toThrow('Failed to retrieve documents.'); // Adjust error message

        expect(logger.error).toHaveBeenCalledWith(`Error fetching documents for patient ${patientId}:`, dbError);
    });
  });

  // --- deleteDocument Tests ---
  describe('deleteDocument', () => {
    const documentId = 'doc-to-delete';
    const mockDocument = { id: documentId, filePath: 'path/to/document.pdf', patientId: 'p1' };

    it('should delete document record and associated file', async () => {
        // Arrange
        DocumentRepository.findById.mockResolvedValue(mockDocument); // Find the doc first
        DocumentRepository.delete.mockResolvedValue(1); // Simulate successful DB delete
        fs.unlink.mockResolvedValue(); // Simulate successful file delete

        // Act
        const result = await documentServiceInstance.deleteDocument(documentId);

        // Assert
        expect(DocumentRepository.findById).toHaveBeenCalledWith(documentId);
        expect(fs.unlink).toHaveBeenCalledWith(mockDocument.filePath);
        expect(DocumentRepository.delete).toHaveBeenCalledWith(documentId);
        expect(result).toEqual({ success: true, message: `Document ${documentId} deleted.` });
        expect(logger.info).toHaveBeenCalledWith(`Deleting document ID: ${documentId}, Path: ${mockDocument.filePath}`);
    });

    it('should throw AppError if document not found', async () => {
        // Arrange
        DocumentRepository.findById.mockResolvedValue(null); // Document not found

        // Act & Assert
        await expect(documentServiceInstance.deleteDocument(documentId))
            .rejects.toThrow(new AppError(`Document with ID ${documentId} not found.`, 404));

        expect(fs.unlink).not.toHaveBeenCalled();
        expect(DocumentRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if deleting document record fails', async () => {
        // Arrange
        const dbError = new Error('DB Delete Failed');
        DocumentRepository.findById.mockResolvedValue(mockDocument);
        DocumentRepository.delete.mockRejectedValue(dbError); // Simulate DB delete failure

        // Act & Assert
        await expect(documentServiceInstance.deleteDocument(documentId))
            .rejects.toThrow('Failed to delete document record.'); // Adjust error message

        expect(fs.unlink).not.toHaveBeenCalled(); // File should not be deleted if DB delete fails
        expect(logger.error).toHaveBeenCalledWith(`Error deleting document record ${documentId}:`, dbError);
    });

    it('should log error but proceed if deleting file fails (optional behavior)', async () => {
        // Arrange
        const fileError = new Error('File Delete Failed');
        DocumentRepository.findById.mockResolvedValue(mockDocument);
        fs.unlink.mockRejectedValue(fileError); // Simulate file delete failure
        DocumentRepository.delete.mockResolvedValue(1); // DB delete succeeds

        // Act
        const result = await documentServiceInstance.deleteDocument(documentId);

        // Assert
        // Verify DB delete still happened
        expect(DocumentRepository.delete).toHaveBeenCalledWith(documentId);
        expect(logger.error).toHaveBeenCalledWith(`Error deleting file ${mockDocument.filePath} for document ${documentId}:`, fileError);
        // Operation might still be considered successful if DB record is gone
        expect(result).toEqual({ success: true, message: `Document ${documentId} deleted.` });
    });
  });

  describe('downloadDocument', () => {
    const documentId = 'doc-to-download';
    const mockDocument = {
      id: documentId,
      filePath: 'path/to/document.pdf',
      fileName: 'test.pdf',
      fileType: 'application/pdf'
    };

    it('should return document stream and metadata', async () => {
      // Arrange
      const mockStream = { pipe: jest.fn() };
      DocumentRepository.findById.mockResolvedValue(mockDocument);
      fs.createReadStream = jest.fn().mockReturnValue(mockStream);

      // Act
      const result = await documentServiceInstance.downloadDocument(documentId);

      // Assert
      expect(DocumentRepository.findById).toHaveBeenCalledWith(documentId);
      expect(result).toEqual({
        stream: mockStream,
        filename: mockDocument.fileName,
        mimeType: mockDocument.fileType
      });
      expect(logger.debug).toHaveBeenCalledWith(`Preparing download for document ID: ${documentId}`);
    });

    it('should throw AppError if document not found', async () => {
      // Arrange
      DocumentRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(documentServiceInstance.downloadDocument(documentId))
        .rejects
        .toThrow(new AppError(`Document with ID ${documentId} not found.`, 404));
    });

    it('should handle file access errors', async () => {
      // Arrange
      const fileError = new Error('File access error');
      DocumentRepository.findById.mockResolvedValue(mockDocument);
      fs.createReadStream = jest.fn().mockImplementation(() => {
        throw fileError;
      });

      // Act & Assert
      await expect(documentServiceInstance.downloadDocument(documentId))
        .rejects
        .toThrow('Failed to access document file.');

      expect(logger.error).toHaveBeenCalledWith(
        `Error accessing file for document ${documentId}:`,
        fileError
      );
    });
  });
});