import { useQuery } from '@tanstack/react-query';
import { searchPatients } from '../api/patients';
import type { Patient } from '../types/patient';

interface UsePatientSearchOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * Hook for searching patients with debounced input
 * @param searchQuery - The search query string
 * @param options - Query options including whether the query is enabled
 * @returns Query result containing patients data
 */
export const usePatientSearch = (
  searchQuery: string,
  options: UsePatientSearchOptions = {}
) => {
  const { enabled = true, limit = 10 } = options;

  return useQuery<Patient[]>({
    queryKey: ['patients', 'search', searchQuery],
    queryFn: () => searchPatients({ query: searchQuery, limit }),
    enabled: enabled && searchQuery.length >= 2, // Only search when query is at least 2 chars
    staleTime: 30000, // Results stay fresh for 30 seconds
    gcTime: 300000, // Keep results in cache for 5 minutes
    retry: false, // Don't retry failed searches
  });
}; 