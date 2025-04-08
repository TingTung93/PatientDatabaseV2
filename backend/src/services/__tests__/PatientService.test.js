const AppError = require('../../errors/AppError');
const PatientRepository = require('../../repositories/PatientRepository');
const logger = require('../../utils/logger');
const PatientService = require('../PatientService');
// Add other necessary imports for mocking (e.g., CautionCardRepository if used)

// --- Mock Dependencies ---
jest.mock('../../repositories/PatientRepository');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));
// Mock other dependencies as needed

describe('PatientService', () => {
  let patientServiceInstance;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    PatientRepository.findAndCountAll.mockReset();
    PatientRepository.findById.mockReset();
    PatientRepository.create.mockReset();
    PatientRepository.update.mockReset();
    PatientRepository.delete.mockReset();
    // Reset other mocked methods

    // Re-require the service or use the exported singleton
    patientServiceInstance = require('../PatientService');
  });

  // --- Test Suites for each method ---

  // Example: listPatients
  describe('listPatients', () => {
    it('should call repository findAndCountAll and return formatted results', async () => {
      // Arrange
      const filters = { limit: 10, offset: 0, search: 'Test' };
      const mockRepoResult = { count: 5, rows: [{ id: 'patient1', name: 'Test Patient' }] };
      PatientRepository.findAndCountAll.mockResolvedValue(mockRepoResult);

      // Act
      const result = await patientServiceInstance.listPatients(filters);

      // Assert
      expect(PatientRepository.findAndCountAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        patients: mockRepoResult.rows,
        pagination: { totalItems: mockRepoResult.count },
      });
      expect(logger.debug).toHaveBeenCalledWith('Listing patients with filters:', filters);
    });

     it('should handle errors from the repository', async () => {
        // Arrange
        const filters = {};
        const dbError = new Error('DB Error');
        PatientRepository.findAndCountAll.mockRejectedValue(dbError);

        // Act & Assert
        await expect(patientServiceInstance.listPatients(filters))
            .rejects.toThrow('Failed to retrieve patients.'); // Adjust error message based on service impl

        expect(logger.error).toHaveBeenCalledWith('Error listing patients:', dbError);
    });
  });

  // Example: getPatientDetails
  describe('getPatientDetails', () => {
     it('should retrieve patient details using repository findById', async () => {
        // Arrange
        const patientId = 'patient-abc';
        const mockPatient = { id: patientId, name: 'Details Patient', cautionCards: [] };
        PatientRepository.findById.mockResolvedValue(mockPatient);

        // Act
        const result = await patientServiceInstance.getPatientDetails(patientId);

        // Assert
        expect(PatientRepository.findById).toHaveBeenCalledWith(patientId);
        expect(result).toEqual(mockPatient);
        expect(logger.debug).toHaveBeenCalledWith(`Fetching details for patient ID: ${patientId}`);
    });

     it('should throw AppError if patient not found', async () => {
        // Arrange
        const patientId = 'not-found';
        PatientRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(patientServiceInstance.getPatientDetails(patientId))
            .rejects.toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

        expect(PatientRepository.findById).toHaveBeenCalledWith(patientId);
    });

     it('should handle errors from the repository', async () => {
        // Arrange
        const patientId = 'error-id';
        const dbError = new Error('DB Error');
        PatientRepository.findById.mockRejectedValue(dbError);

        // Act & Assert
        await expect(patientServiceInstance.getPatientDetails(patientId))
            .rejects.toThrow('Failed to retrieve patient details.'); // Adjust error message

        expect(logger.error).toHaveBeenCalledWith(`Error fetching details for patient ${patientId}:`, dbError);
    });
  });

  // Example: createPatient
  describe('createPatient', () => {
    it('should create a patient using the repository', async () => {
        // Arrange
        const patientData = { name: 'New Patient', dateOfBirth: '2000-01-01' };
        const createdPatient = { id: 'new-patient-id', ...patientData };
        PatientRepository.create.mockResolvedValue(createdPatient);

        // Act
        const result = await patientServiceInstance.createPatient(patientData);

        // Assert
        expect(PatientRepository.create).toHaveBeenCalledWith(patientData);
        expect(result).toEqual(createdPatient);
        expect(logger.info).toHaveBeenCalledWith('Creating new patient:', patientData);
    });

     it('should handle errors during patient creation', async () => {
        // Arrange
        const patientData = { name: 'Fail Patient' };
        const dbError = new Error('Create Failed');
        PatientRepository.create.mockRejectedValue(dbError);

        // Act & Assert
        await expect(patientServiceInstance.createPatient(patientData))
            .rejects.toThrow('Failed to create patient.'); // Adjust error message

        expect(logger.error).toHaveBeenCalledWith('Error creating patient:', dbError);
    });
  });

  // Example: updatePatient
  describe('updatePatient', () => {
     it('should update a patient using the repository', async () => {
        // Arrange
        const patientId = 'patient-to-update';
        const updateData = { name: 'Updated Name' };
        const updatedPatient = { id: patientId, name: 'Updated Name' };
        // Mock findById first to ensure patient exists (if service checks)
        PatientRepository.findById.mockResolvedValue({ id: patientId, name: 'Old Name' });
        PatientRepository.update.mockResolvedValue([1, [updatedPatient]]); // Sequelize update returns [count, rows]

        // Act
        const result = await patientServiceInstance.updatePatient(patientId, updateData);

        // Assert
        expect(PatientRepository.findById).toHaveBeenCalledWith(patientId); // Verify check if applicable
        expect(PatientRepository.update).toHaveBeenCalledWith(patientId, updateData);
        expect(result).toEqual(updatedPatient);
        expect(logger.info).toHaveBeenCalledWith(`Updating patient ID ${patientId} with data:`, updateData);
    });

     it('should throw AppError if patient to update is not found', async () => {
        // Arrange
        const patientId = 'not-found-update';
        const updateData = { name: 'Wont Update' };
        PatientRepository.findById.mockResolvedValue(null); // Simulate patient not found

        // Act & Assert
        await expect(patientServiceInstance.updatePatient(patientId, updateData))
            .rejects.toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

        expect(PatientRepository.update).not.toHaveBeenCalled();
    });

     it('should handle errors during patient update', async () => {
        // Arrange
        const patientId = 'error-update';
        const updateData = { name: 'Error Update' };
        const dbError = new Error('Update Failed');
        PatientRepository.findById.mockResolvedValue({ id: patientId, name: 'Old Name' });
        PatientRepository.update.mockRejectedValue(dbError);

        // Act & Assert
        await expect(patientServiceInstance.updatePatient(patientId, updateData))
            .rejects.toThrow('Failed to update patient.'); // Adjust error message

        expect(logger.error).toHaveBeenCalledWith(`Error updating patient ${patientId}:`, dbError);
    });
  });
describe('deletePatient', () => {
  it('should delete a patient using the repository', async () => {
    // Arrange
    const patientId = 'patient-to-delete';
    PatientRepository.findById.mockResolvedValue({ id: patientId });
    PatientRepository.delete.mockResolvedValue(1); // 1 row deleted

    // Act
    await patientServiceInstance.deletePatient(patientId);

    // Assert
    expect(PatientRepository.findById).toHaveBeenCalledWith(patientId);
    expect(PatientRepository.delete).toHaveBeenCalledWith(patientId);
    expect(logger.info).toHaveBeenCalledWith(`Deleting patient ID: ${patientId}`);
  });

  it('should throw AppError if patient to delete is not found', async () => {
    // Arrange
    const patientId = 'not-found-delete';
    PatientRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(patientServiceInstance.deletePatient(patientId))
      .rejects
      .toThrow(new AppError(`Patient with ID ${patientId} not found.`, 404));

    expect(PatientRepository.delete).not.toHaveBeenCalled();
  });

  it('should handle errors during patient deletion', async () => {
    // Arrange
    const patientId = 'error-delete';
    const dbError = new Error('Delete Failed');
    PatientRepository.findById.mockResolvedValue({ id: patientId });
    PatientRepository.delete.mockRejectedValue(dbError);

    // Act & Assert
    await expect(patientServiceInstance.deletePatient(patientId))
      .rejects
      .toThrow('Failed to delete patient.');

    expect(logger.error).toHaveBeenCalledWith(`Error deleting patient ${patientId}:`, dbError);
  });
});

describe('input validation', () => {
  describe('createPatient', () => {
    it('should validate required fields', async () => {
      const invalidData = {};
      await expect(patientServiceInstance.createPatient(invalidData))
        .rejects
        .toThrow('Missing required fields');
    });

    it('should validate date format', async () => {
      const invalidDateData = {
        name: 'Test Patient',
        dateOfBirth: 'invalid-date'
      };
      await expect(patientServiceInstance.createPatient(invalidDateData))
        .rejects
        .toThrow('Invalid date format');
    });
  });

  describe('updatePatient', () => {
    it('should validate date format in updates', async () => {
      const patientId = 'test-id';
      const invalidDateData = {
        dateOfBirth: 'invalid-date'
      };
      PatientRepository.findById.mockResolvedValue({ id: patientId });

      await expect(patientServiceInstance.updatePatient(patientId, invalidDateData))
        .rejects
        .toThrow('Invalid date format');
    });
  });
});

describe('edge cases', () => {
  it('should handle empty search results gracefully', async () => {
    // Arrange
    const filters = { search: 'nonexistent' };
    PatientRepository.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    // Act
    const result = await patientServiceInstance.listPatients(filters);

    // Assert
    expect(result).toEqual({
      patients: [],
      pagination: { totalItems: 0 }
    });
  });

  it('should handle special characters in search', async () => {
    // Arrange
    const filters = { search: '%special#' };
    const sanitizedSearch = 'special';
    const mockResult = { count: 0, rows: [] };
    PatientRepository.findAndCountAll.mockResolvedValue(mockResult);

    // Act
    await patientServiceInstance.listPatients(filters);

    // Assert
    expect(PatientRepository.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.not.stringContaining('%')
      })
    );
  });
});

});