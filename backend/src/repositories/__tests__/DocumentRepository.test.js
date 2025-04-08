const { Op } = require('sequelize'); // Import Op if used

const db = require('../../database/models'); // Path to your Sequelize models index
const logger = require('../../utils/logger');
const DocumentRepository = require('../DocumentRepository');


// --- Mock Dependencies ---
const mockDocumentModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(), // Or findAndCountAll if used
  destroy: jest.fn(),
  // Mock other methods if used
};
const mockPatientModel = {
  // Mock methods if Patient model is directly used for associations
};

jest.mock('../../database/models', () => ({
  Document: mockDocumentModel,
  Patient: mockPatientModel,
  // Add other models if needed
  sequelize: { // Mock sequelize instance if needed
    transaction: jest.fn(),
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('DocumentRepository', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockDocumentModel.create.mockReset();
    mockDocumentModel.findByPk.mockReset();
    mockDocumentModel.findAll.mockReset(); // Or findAndCountAll
    mockDocumentModel.destroy.mockReset();
  });

  // --- create Tests ---
  describe('create', () => {
    it('should call Document.create with provided data', async () => {
      // Arrange
      const docData = { patientId: 'p1', filePath: 'path/doc.pdf', fileName: 'doc.pdf', fileType: 'application/pdf' };
      const createdDoc = { id: 'doc-1', ...docData };
      mockDocumentModel.create.mockResolvedValue(createdDoc);

      // Act
      const result = await DocumentRepository.create(docData);

      // Assert
      expect(mockDocumentModel.create).toHaveBeenCalledWith(docData);
      expect(result).toEqual(createdDoc);
      expect(logger.debug).toHaveBeenCalledWith('Creating Document:', docData);
    });

    it('should handle errors from Document.create', async () => {
        // Arrange
        const docData = { patientId: 'p-fail' };
        const dbError = new Error('Sequelize Create Error');
        mockDocumentModel.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(DocumentRepository.create(docData))
            .rejects.toThrow(dbError); // Repository might just re-throw

        expect(logger.error).toHaveBeenCalledWith('Error creating Document:', dbError);
    });
  });

  // --- findById Tests ---
  describe('findById', () => {
    it('should call Document.findByPk with correct id', async () => {
        // Arrange
        const docId = 'find-doc-id';
        const mockDoc = { id: docId, fileName: 'test.pdf', Patient: { id: 'p1' } };
        mockDocumentModel.findByPk.mockResolvedValue(mockDoc);

        // Act
        const result = await DocumentRepository.findById(docId);

        // Assert
        expect(mockDocumentModel.findByPk).toHaveBeenCalledWith(docId, {
             include: [{ model: db.Patient, as: 'Patient' }] // Example include
        });
        expect(result).toEqual(mockDoc);
        expect(logger.debug).toHaveBeenCalledWith(`Finding Document by ID: ${docId}`);
    });

     it('should return null if Document.findByPk returns null', async () => {
        // Arrange
        const docId = 'not-found-doc-id';
        mockDocumentModel.findByPk.mockResolvedValue(null);

        // Act
        const result = await DocumentRepository.findById(docId);

        // Assert
        expect(mockDocumentModel.findByPk).toHaveBeenCalledWith(docId, expect.any(Object));
        expect(result).toBeNull();
    });

     it('should handle errors from Document.findByPk', async () => {
        // Arrange
        const docId = 'error-doc-id';
        const dbError = new Error('Sequelize Find Error');
        mockDocumentModel.findByPk.mockRejectedValue(dbError);

        // Act & Assert
        await expect(DocumentRepository.findById(docId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding Document by ID ${docId}:`, dbError);
    });
  });

  // --- findByPatientId Tests (Assuming it uses findAll) ---
  describe('findByPatientId', () => {
    it('should call Document.findAll with correct patientId filter', async () => {
        // Arrange
        const patientId = 'patient-docs-1';
        const mockDocs = [{ id: 'doc-a', patientId }, { id: 'doc-b', patientId }];
        mockDocumentModel.findAll.mockResolvedValue(mockDocs);

        // Act
        const result = await DocumentRepository.findByPatientId(patientId);

        // Assert
        expect(mockDocumentModel.findAll).toHaveBeenCalledWith({
            where: { patientId: patientId },
            order: [['uploadDate', 'DESC']] // Example order
            // include: [] // Add includes if used
        });
        expect(result).toEqual(mockDocs);
        expect(logger.debug).toHaveBeenCalledWith(`Finding Documents for Patient ID: ${patientId}`);
    });

     it('should return empty array if no documents found for patient', async () => {
        // Arrange
        const patientId = 'patient-no-docs';
        mockDocumentModel.findAll.mockResolvedValue([]); // Simulate no results

        // Act
        const result = await DocumentRepository.findByPatientId(patientId);

        // Assert
        expect(mockDocumentModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
            where: { patientId: patientId }
        }));
        expect(result).toEqual([]);
    });

     it('should handle errors from Document.findAll', async () => {
        // Arrange
        const patientId = 'patient-error-docs';
        const dbError = new Error('Sequelize FindAll Error');
        mockDocumentModel.findAll.mockRejectedValue(dbError);

        // Act & Assert
        await expect(DocumentRepository.findByPatientId(patientId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding Documents for Patient ID ${patientId}:`, dbError);
    });
  });

  // --- delete Tests ---
  describe('delete', () => {
    it('should call Document.destroy with correct id', async () => {
        // Arrange
        const docId = 'delete-doc-id';
        const deleteResult = 1; // Simulate 1 row deleted
        mockDocumentModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await DocumentRepository.delete(docId);

        // Assert
        expect(mockDocumentModel.destroy).toHaveBeenCalledWith({
            where: { id: docId }
        });
        expect(result).toEqual(deleteResult);
        expect(logger.debug).toHaveBeenCalledWith(`Deleting Document ID: ${docId}`);
    });

     it('should return 0 if no document found to delete', async () => {
        // Arrange
        const docId = 'delete-not-found-id';
        const deleteResult = 0;
        mockDocumentModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await DocumentRepository.delete(docId);

        // Assert
        expect(mockDocumentModel.destroy).toHaveBeenCalledWith({ where: { id: docId } });
        expect(result).toEqual(0);
    });

     it('should handle errors from Document.destroy', async () => {
        // Arrange
        const docId = 'delete-error-id';
        const dbError = new Error('Sequelize Destroy Error');
        mockDocumentModel.destroy.mockRejectedValue(dbError);

        // Act & Assert
        await expect(DocumentRepository.delete(docId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error deleting Document ID ${docId}:`, dbError);
    });
  });

  // Add tests for findAndCountAll or other specific methods if they exist
});