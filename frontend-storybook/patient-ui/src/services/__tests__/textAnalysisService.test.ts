import { textAnalysisService } from '../textAnalysisService'; // Adjust path
import { apiClient } from '../../api/apiClient'; // Adjust path
import { AnalysisResult, StructuredData } from '../../types/textAnalysis'; // Import types directly

// Mock the apiClient
jest.mock('../../api/apiClient');

// Create a typed mock instance
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('textAnalysisService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  const sampleText = 'Patient presents with high blood pressure. Prescribed Lisinopril.';

  // --- analyze ---
  it('analyze should call apiClient.post with text and return analysis results', async () => {
    const mockResponse: AnalysisResult = {
      // Use imported type name
      entities: [{ text: 'Lisinopril', type: 'MEDICATION', confidence: 0.95 }], // Added confidence
      keyPhrases: ['high blood pressure'],
      sentiment: { score: -0.5, label: 'negative' },
      structuredData: {},
      suggestions: [],
      summary: 'Patient has high blood pressure.', // Added missing property
      keywords: ['hypertension', 'Lisinopril'], // Added missing property
    } as AnalysisResult; // Use imported type name
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await textAnalysisService.analyze(sampleText);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/text-analysis/analyze', { text: sampleText });
    expect(result).toEqual(mockResponse);
  });

  it('analyze should handle API errors', async () => {
    const mockError = new Error('Analysis service unavailable');
    mockApiClient.post.mockRejectedValueOnce(mockError);

    await expect(textAnalysisService.analyze(sampleText)).rejects.toThrow(
      'Analysis service unavailable'
    );
    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/text-analysis/analyze', { text: sampleText });
  });

  // --- extractStructuredData ---
  it('extractStructuredData should call apiClient.post with text and return structured data', async () => {
    const mockResponse: StructuredData = {
      patientInfo: { name: 'John Doe' },
      medications: [{ name: 'Lisinopril', dosage: '10mg' }],
    };
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await textAnalysisService.extractStructuredData(sampleText);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/text-analysis/extract-structured', {
      text: sampleText,
    });
    expect(result).toEqual(mockResponse);
  });

  // --- getSuggestions ---
  it('getSuggestions should call apiClient.post with text and return suggestions array', async () => {
    const mockResponse = { suggestions: ['Consider adding BP monitoring'] }; // API returns object with suggestions key
    mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await textAnalysisService.getSuggestions(sampleText);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/text-analysis/suggestions', {
      text: sampleText,
    });
    expect(result).toEqual(mockResponse.suggestions);
  });
});
