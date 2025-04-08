import apiClient from './client'; // Use default import

interface SearchResult {
  id: string | number;
  type: 'patient' | 'report' | 'caution-card';
  title: string;
  subtitle?: string;
}

export const searchService = {
  globalSearch: async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    const response = await apiClient.get<SearchResult[]>('/search', {
      params: { q: query },
    });

    // Transform the response data to match our SearchResult interface
    return response.data.map(result => ({
      ...result,
      // Ensure the type is one of our allowed types
      type: result.type as 'patient' | 'report' | 'caution-card',
      // Add any additional transformations needed
    }));
  },

  // Add other search-related API calls here if needed
  searchPatients: async (query: string) => {
    const response = await apiClient.get('/search/patients', {
      params: { q: query },
    });
    return response.data;
  },

  searchReports: async (query: string) => {
    const response = await apiClient.get('/search/reports', {
      params: { q: query },
    });
    return response.data;
  },

  searchCautionCards: async (query: string) => {
    const response = await apiClient.get('/search/caution-cards', {
      params: { q: query },
    });
    return response.data;
  },
};
