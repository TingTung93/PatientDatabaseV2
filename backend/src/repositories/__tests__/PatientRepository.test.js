const { Op } = require('sequelize'); // Import Op if used for complex queries

const db = require('../../database/models'); // Path to your Sequelize models index
const logger = require('../../utils/logger');
const PatientRepository = require('../PatientRepository');


// --- Mock Dependencies ---
const mockPatientModel = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};
const mockCautionCardModel = {
  // Mock methods if CautionCard model is directly used for associations
};
// Add mocks for other associated models like Document, Report if needed

jest.mock('../../database/models', () => ({
  Patient: mockPatientModel,
  CautionCard: mockCautionCardModel,
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

describe('PatientRepository', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockPatientModel.create.mockReset();
    mockPatientModel.findByPk.mockReset();
    mockPatientModel.findAndCountAll.mockReset();
    mockPatientModel.update.mockReset();
    mockPatientModel.destroy.mockReset();
    // Reset other model mocks if used
  });

  // --- create Tests ---
  describe('create', () => {
    it('should call Patient.create with provided data', async () => {
      // Arrange
      const patientData = { name: 'New Patient', dateOfBirth: '1990-05-15', mrn: 'MRN123' };
      const createdPatient = { id: 'patient-1', ...patientData };
      mockPatientModel.create.mockResolvedValue(createdPatient);

      // Act
      const result = await PatientRepository.create(patientData);

      // Assert
      expect(mockPatientModel.create).toHaveBeenCalledWith(patientData);
      expect(result).toEqual(createdPatient);
      expect(logger.debug).toHaveBeenCalledWith('Creating Patient:', patientData);
    });

    it('should handle errors from Patient.create', async () => {
        // Arrange
        const patientData = { name: 'Fail Patient' };
        const dbError = new Error('Sequelize Create Error');
        mockPatientModel.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(PatientRepository.create(patientData))
            .rejects.toThrow(dbError); // Repository might just re-throw

        expect(logger.error).toHaveBeenCalledWith('Error creating Patient:', dbError);
    });
  });

  // --- findById Tests ---
  describe('findById', () => {
    it('should call Patient.findByPk with correct id and include associations', async () => {
        // Arrange
        const patientId = 'find-patient-id';
        const mockPatient = { id: patientId, name: 'Test Patient', CautionCards: [] };
        mockPatientModel.findByPk.mockResolvedValue(mockPatient);

        // Act
        const result = await PatientRepository.findById(patientId);

        // Assert
        expect(mockPatientModel.findByPk).toHaveBeenCalledWith(patientId, {
            include: [
                { model: db.CautionCard, as: 'CautionCards' },
                // Add other includes like Documents, Reports if defined in repo
            ]
        });
        expect(result).toEqual(mockPatient);
        expect(logger.debug).toHaveBeenCalledWith(`Finding Patient by ID: ${patientId}`);
    });

     it('should return null if Patient.findByPk returns null', async () => {
        // Arrange
        const patientId = 'not-found-patient-id';
        mockPatientModel.findByPk.mockResolvedValue(null);

        // Act
        const result = await PatientRepository.findById(patientId);

        // Assert
        expect(mockPatientModel.findByPk).toHaveBeenCalledWith(patientId, expect.any(Object));
        expect(result).toBeNull();
    });

     it('should handle errors from Patient.findByPk', async () => {
        // Arrange
        const patientId = 'error-patient-id';
        const dbError = new Error('Sequelize Find Error');
        mockPatientModel.findByPk.mockRejectedValue(dbError);

        // Act & Assert
        await expect(PatientRepository.findById(patientId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error finding Patient by ID ${patientId}:`, dbError);
    });
  });

  // --- update Tests ---
  describe('update', () => {
     it('should call Patient.update with correct id and data', async () => {
        // Arrange
        const patientId = 'update-patient-id';
        const updateData = { name: 'Updated Name', mrn: 'MRN456' };
        const updateResult = [1]; // Sequelize update returns [count]
        mockPatientModel.update.mockResolvedValue(updateResult);

        // Act
        // Assuming update returns the count or raw result, not the updated object
        const result = await PatientRepository.update(patientId, updateData);

        // Assert
        expect(mockPatientModel.update).toHaveBeenCalledWith(updateData, {
            where: { id: patientId },
            // returning: true, // Add if repo uses returning: true
        });
        expect(result).toEqual(updateResult);
        expect(logger.debug).toHaveBeenCalledWith(`Updating Patient ID ${patientId} with data:`, updateData);
    });

     it('should handle errors from Patient.update', async () => {
        // Arrange
        const patientId = 'update-error-patient-id';
        const updateData = { name: 'Error Name' };
        const dbError = new Error('Sequelize Update Error');
        mockPatientModel.update.mockRejectedValue(dbError);

        // Act & Assert
        await expect(PatientRepository.update(patientId, updateData))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error updating Patient ID ${patientId}:`, dbError);
    });

     it('should return 0 if no patient found to update', async () => {
        // Arrange
        const patientId = 'update-not-found-id';
        const updateData = { name: 'No Update' };
        const updateResult = [0]; // Simulate no rows updated
        mockPatientModel.update.mockResolvedValue(updateResult);

        // Act
        const result = await PatientRepository.update(patientId, updateData);

        // Assert
        expect(mockPatientModel.update).toHaveBeenCalledWith(updateData, { where: { id: patientId } });
        expect(result).toEqual(updateResult);
    });
  });

  // --- delete Tests ---
   describe('delete', () => {
    it('should call Patient.destroy with correct id', async () => {
        // Arrange
        const patientId = 'delete-patient-id';
        const deleteResult = 1; // Simulate 1 row deleted
        mockPatientModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await PatientRepository.delete(patientId);

        // Assert
        expect(mockPatientModel.destroy).toHaveBeenCalledWith({
            where: { id: patientId }
        });
        expect(result).toEqual(deleteResult);
        expect(logger.debug).toHaveBeenCalledWith(`Deleting Patient ID: ${patientId}`);
    });

     it('should return 0 if no patient found to delete', async () => {
        // Arrange
        const patientId = 'delete-not-found-id';
        const deleteResult = 0;
        mockPatientModel.destroy.mockResolvedValue(deleteResult);

        // Act
        const result = await PatientRepository.delete(patientId);

        // Assert
        expect(mockPatientModel.destroy).toHaveBeenCalledWith({ where: { id: patientId } });
        expect(result).toEqual(0);
    });

     it('should handle errors from Patient.destroy', async () => {
        // Arrange
        const patientId = 'delete-error-id';
        const dbError = new Error('Sequelize Destroy Error');
        mockPatientModel.destroy.mockRejectedValue(dbError);

        // Act & Assert
        await expect(PatientRepository.delete(patientId))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith(`Error deleting Patient ID ${patientId}:`, dbError);
    });
  });


  // --- findAndCountAll Tests ---
  describe('findAndCountAll', () => {
    it('should call Patient.findAndCountAll with default options', async () => {
        // Arrange
        const mockResult = { count: 0, rows: [] };
        mockPatientModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        const result = await PatientRepository.findAndCountAll({});

        // Assert
        expect(mockPatientModel.findAndCountAll).toHaveBeenCalledWith({
            where: {},
            include: [ /* Default includes if any */ ],
            limit: 10, // Default limit
            offset: 0,  // Default offset
            order: [['name', 'ASC']] // Default order (example)
        });
        expect(result).toEqual(mockResult);
        expect(logger.debug).toHaveBeenCalledWith('Finding and counting Patients with options:', expect.any(Object));
    });

    it('should apply search filter correctly (example: name and mrn)', async () => {
        // Arrange
        const filters = { search: 'Test' };
        const mockResult = { count: 1, rows: [{ id: 'p1' }] };
        mockPatientModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await PatientRepository.findAndCountAll(filters);

        // Assert
        expect(mockPatientModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                 [Op.or]: [
                    { name: { [Op.like]: '%Test%' } },
                    { mrn: { [Op.like]: '%Test%' } },
                    // Add other searchable fields
                 ]
            },
        }));
    });

     it('should apply limit and offset correctly', async () => {
        // Arrange
        const filters = { limit: 25, offset: 50 };
        const mockResult = { count: 100, rows: [] };
        mockPatientModel.findAndCountAll.mockResolvedValue(mockResult);

        // Act
        await PatientRepository.findAndCountAll(filters);

        // Assert
        expect(mockPatientModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
            limit: 25,
            offset: 50,
        }));
    });

     it('should handle errors from Patient.findAndCountAll', async () => {
        // Arrange
        const filters = {};
        const dbError = new Error('Sequelize FindAll Error');
        mockPatientModel.findAndCountAll.mockRejectedValue(dbError);

        // Act & Assert
        await expect(PatientRepository.findAndCountAll(filters))
            .rejects.toThrow(dbError);

        expect(logger.error).toHaveBeenCalledWith('Error finding and counting Patients:', dbError);
    });
  });

});