import { patientService } from '../patientService'; // Adjust path as needed
import { apiClient } from '../../api/apiClient'; // Adjust path as needed
import {
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  BatchOperation,
  BatchOperationResult, // Use suggested type
  // AdvancedPatientSearchParams - Assuming this is defined here too
} from '../../types/patient'; // Adjust path as needed
import { PaginatedResponse } from '../../types/common'; // Import from common types

// Mock the apiClient
jest.mock('../../api/apiClient');

// Create a typed mock instance
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('patientService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // --- getPatients ---
  it('getPatients should call apiClient.get with correct params and return data', async () => {
    const mockParams = { page: 1, limit: 10 };
    // Provide a more complete Patient mock
    const mockPatient1: Patient = {
      id: '1',
      identification: { id: '1', mrn: 'MRN001' },
      demographics: {
        firstName: 'Test',
        lastName: 'User1',
        dateOfBirth: '1990-01-01',
        gender: 'O',
      },
      bloodProfile: { abo: 'O', rh: '+' },
      medicalHistory: {},
      createdAt: '',
      updatedAt: '',
    } as Patient;
    const mockResponse: PaginatedResponse<Patient> = {
      data: [mockPatient1],
      total: 1,
      page: 1,
      limit: 10,
    };
    mockApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await patientService.getPatients(mockParams);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/patients', { params: mockParams });
    expect(result).toEqual(mockResponse);
  });

  it('getPatients should handle API errors', async () => {
    const mockError = new Error('Network Error');
    mockApiClient.get.mockRejectedValueOnce(mockError);

    await expect(patientService.getPatients()).rejects.toThrow('Network Error');
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  // --- getPatientById ---
  it('getPatientById should call apiClient.get with correct ID and return data', async () => {
    const patientId = 'patient-abc';
    const mockPatient = {
      id: patientId,
      identification: { id: patientId, mrn: 'MRN002' },
    } as Patient;
    mockApiClient.get.mockResolvedValueOnce({ data: mockPatient });

    const result = await patientService.getPatientById(patientId);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith(`/patients/${patientId}`);
    expect(result).toEqual(mockPatient);
  });

  // --- createPatient ---
  it('createPatient should call apiClient.post with correct data and return new patient', async () => {
    const requestData: CreatePatientRequest = {
      identification: { mrn: 'MRNNEW' },
    } as CreatePatientRequest;
    const mockNewPatient = { id: 'new-xyz', ...requestData } as Patient;
    mockApiClient.post.mockResolvedValueOnce({ data: mockNewPatient });

    const result = await patientService.createPatient(requestData);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/patients', requestData);
    expect(result).toEqual(mockNewPatient);
  });

  // --- updatePatient ---
  it('updatePatient should call apiClient.put with correct ID and data', async () => {
    const patientId = 'update-me';
    const requestData: UpdatePatientRequest = {
      demographics: { firstName: 'UpdatedName' },
    } as UpdatePatientRequest;
    const mockUpdatedPatient = { id: patientId, ...requestData } as Patient;
    mockApiClient.put.mockResolvedValueOnce({ data: mockUpdatedPatient });

    const result = await patientService.updatePatient(patientId, requestData);

    expect(mockApiClient.put).toHaveBeenCalledTimes(1);
    expect(mockApiClient.put).toHaveBeenCalledWith(`/patients/${patientId}`, requestData);
    expect(result).toEqual(mockUpdatedPatient);
  });

  // --- deletePatient ---
  it('deletePatient should call apiClient.delete with correct ID', async () => {
    const patientId = 'delete-xyz';
    // Mock for a successful delete (e.g., status 204)
    mockApiClient.delete.mockResolvedValueOnce({ status: 204 });

    await patientService.deletePatient(patientId);

    expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
    expect(mockApiClient.delete).toHaveBeenCalledWith(`/patients/${patientId}`);
  });

  // --- advancedPatientSearch ---
  it('advancedPatientSearch should call apiClient.get with correct params', async () => {
    // Adjust mockParams to likely match AdvancedPatientSearchParams structure
    const mockParams = { name: 'test', dateOfBirth: '2000-01-01' }; // Guessing field names
    const mockResponse: PaginatedResponse<Patient> = { data: [], total: 0, page: 1, limit: 10 }; // Empty response
    mockApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    await patientService.advancedPatientSearch(mockParams);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/patients/search', { params: mockParams });
  });

  // --- batchOperations ---
  it('batchOperations should call apiClient.post with batch data', async () => {
    // Adjust requestData structure to match BatchOperation type (object with operations array)
    const requestData: BatchOperation = {
      operations: [
        { operation: 'delete', id: '1' }, // Assuming this inner structure is correct
        { operation: 'delete', id: '2' },
      ],
    };
    // Adjust mockResponse based on likely BatchOperationResult structure
    // Add required 'results' property with 'operation' in each item
    const mockResponse: BatchOperationResult = {
      success: true,
      results: [
        { operation: 'delete', id: '1', success: true },
        { operation: 'delete', id: '2', success: true },
      ],
    };
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    await patientService.batchOperations(requestData);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/patients/batch', requestData);
  });
});
