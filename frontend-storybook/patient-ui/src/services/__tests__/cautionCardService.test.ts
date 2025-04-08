import { cautionCardService } from '../cautionCardService'; // Adjust path
import { apiClient } from '../../api/apiClient'; // Adjust path
import {
  CautionCard,
  CautionCardUploadData,
  CautionCardUpdateData,
  CautionCardSearchParams,
  GetCautionCardsResponse, // Ensure this type is imported or defined
} from '../../types/cautionCard'; // Adjust path

// Mock the apiClient
jest.mock('../../api/apiClient');

// Create a typed mock instance
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('cautionCardService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // --- getCautionCards ---
  it('getCautionCards should call apiClient.get with correct params and return data', async () => {
    const mockParams: CautionCardSearchParams = { page: 1, limit: 5, status: 'pending' };
    // Assuming GetCautionCardsResponse is PaginatedResponse<CautionCard>
    const mockResponse: GetCautionCardsResponse = {
      data: [
        {
          id: 1,
          ocr_text: 'Card 1',
          file_name: 'mock.png',
          file_path: '/mock.png',
          file_size: 100,
          file_type: 'image/png',
          status: 'pending',
          created_at: '',
          updated_at: '',
        } as CautionCard,
      ], // Use 'data' property and provide a more complete mock
      total: 1,
      page: 1, // Add potentially missing pagination fields
      limit: 5, // Add potentially missing pagination fields
    };
    mockApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await cautionCardService.getCautionCards(mockParams);

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/caution-cards', { params: mockParams });
    expect(result).toEqual(mockResponse);
  });

  // --- getOrphanedCards ---
  it('getOrphanedCards should call apiClient.get and return data', async () => {
    const mockResponse: CautionCard[] = [{ id: 2, ocr_text: 'Orphaned Card' } as CautionCard];
    mockApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await cautionCardService.getOrphanedCards();

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/caution-cards/orphaned');
    expect(result).toEqual(mockResponse);
  });

  // --- uploadCautionCard ---
  it('uploadCautionCard should call apiClient.post with FormData', async () => {
    const mockFile = new File(['img'], 'card.png', { type: 'image/png' });
    const uploadData: CautionCardUploadData = {
      file: mockFile,
      bloodType: 'O',
      antibodies: ['Anti-D'],
      transfusionRequirements: ['Irradiated'], // Should likely be string[]
    };
    const mockResponse: CautionCard = { id: 3, file_name: 'card.png' } as CautionCard;
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    // Manually construct FormData as expected by the service function
    const formData = new FormData();
    formData.append('file', uploadData.file);
    if (uploadData.bloodType) formData.append('bloodType', uploadData.bloodType);
    if (uploadData.antibodies) formData.append('antibodies', JSON.stringify(uploadData.antibodies));
    if (uploadData.transfusionRequirements)
      formData.append(
        'transfusionRequirements',
        JSON.stringify(uploadData.transfusionRequirements)
      );

    const result = await cautionCardService.uploadCautionCard(formData); // Pass FormData

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    // Check specific FormData content is harder, check type and endpoint
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/caution-cards/process',
      formData, // Check if the actual formData object was passed
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(result).toEqual(mockResponse);

    // The check that mockApiClient.post was called with formData covers this sufficiently now
  });

  // --- updateCautionCard ---
  it('updateCautionCard should call apiClient.put with correct ID and data', async () => {
    const cardId = 10;
    const updateData: CautionCardUpdateData = { bloodType: 'AB' }; // Example update
    // Provide a fully complete mock CautionCard, using 0 for patient_id to satisfy type 'number'
    const mockResponse: CautionCard = {
      id: cardId,
      patient_id: 0,
      bloodType: 'AB',
      ocr_text: '',
      file_name: '',
      file_path: '',
      file_size: 0,
      file_type: '',
      status: 'pending',
      created_at: '',
      updated_at: '',
      antibodies: [],
      transfusion_requirements: [],
      metadata: {},
    } as CautionCard;
    mockApiClient.put.mockResolvedValueOnce({ data: mockResponse });

    const result = await cautionCardService.updateCautionCard(cardId, updateData);

    expect(mockApiClient.put).toHaveBeenCalledTimes(1);
    expect(mockApiClient.put).toHaveBeenCalledWith(`/caution-cards/${cardId}`, updateData);
    expect(result).toEqual(mockResponse);
  });

  // --- markAsReviewed ---
  it('markAsReviewed should call apiClient.post with correct ID and reviewer', async () => {
    const cardId = 11;
    const reviewedBy = 'user123';
    // Provide a fully complete mock CautionCard, using 0 for patient_id to satisfy type 'number'
    const mockResponse: CautionCard = {
      id: cardId,
      patient_id: 0,
      status: 'reviewed',
      reviewed_by: reviewedBy,
      reviewed_date: new Date().toISOString(),
      ocr_text: '',
      file_name: '',
      file_path: '',
      file_size: 0,
      file_type: '',
      created_at: '',
      updated_at: '',
      antibodies: [],
      transfusion_requirements: [],
      metadata: {},
    } as CautionCard;
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await cautionCardService.markAsReviewed(cardId, reviewedBy);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith(`/caution-cards/${cardId}/review`, {
      reviewedBy,
    });
    expect(result).toEqual(mockResponse);
  });

  // --- linkToPatient ---
  it('linkToPatient should call apiClient.post with correct IDs and updater', async () => {
    const cardId = 12;
    const patientId = 99;
    const updatedBy = 'user456';
    // Provide a fully complete mock CautionCard, using allowed status
    const mockResponse: CautionCard = {
      id: cardId,
      patient_id: patientId,
      updated_by: updatedBy,
      status: 'pending',
      ocr_text: '',
      file_name: '',
      file_path: '',
      file_size: 0,
      file_type: '',
      created_at: '',
      updated_at: '',
      antibodies: [],
      transfusion_requirements: [],
      metadata: {},
    } as CautionCard;
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await cautionCardService.linkToPatient(cardId, patientId, updatedBy);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith(`/caution-cards/${cardId}/link`, {
      patientId,
      updatedBy,
    });
    expect(result).toEqual(mockResponse);
  });

  // TODO: Add tests for error handling in each function
});
