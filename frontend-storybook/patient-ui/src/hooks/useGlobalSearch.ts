import { useQuery } from '@tanstack/react-query';
import { searchService } from '../api/searchService';

interface SearchResult {
  id: string | number;
  type: 'patient' | 'report' | 'caution-card';
  title: string;
  subtitle?: string;
}

export const useGlobalSearch = (query: string) => {
  return useQuery<SearchResult[]>({
    queryKey: ['globalSearch', query],
    queryFn: () => searchService.globalSearch(query),
    enabled: query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 30000, // Results stay fresh for 30 seconds
    gcTime: 300000, // Cache results for 5 minutes (garbage collection time)
  });
};

export default useGlobalSearch;
