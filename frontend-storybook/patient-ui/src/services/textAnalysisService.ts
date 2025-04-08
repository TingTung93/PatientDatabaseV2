import { AnalysisResult, StructuredData } from '../types/textAnalysis';
import { apiClient } from '../api/apiClient';

class TextAnalysisService {
  private readonly baseUrl = '/text-analysis';

  async analyze(text: string): Promise<AnalysisResult> {
    const response = await apiClient.post<AnalysisResult>(`${this.baseUrl}/analyze`, { text });
    return response.data;
  }

  async extractStructuredData(text: string): Promise<StructuredData> {
    const response = await apiClient.post<StructuredData>(`${this.baseUrl}/extract-structured`, { text });
    return response.data;
  }

  async getSuggestions(text: string): Promise<string[]> {
    const response = await apiClient.post<{ suggestions: string[] }>(`${this.baseUrl}/suggestions`, { text });
    return response.data.suggestions;
  }
}

export const textAnalysisService = new TextAnalysisService(); 