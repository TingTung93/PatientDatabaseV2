import { useState, useCallback } from 'react';
import { FilterCriteria } from '../components/search/FilterBar';

interface UsePatientFiltersResult {
  filters: FilterCriteria;
  setFilters: (filters: FilterCriteria) => void;
  resetFilters: () => void;
  getQueryParams: () => Record<string, string>;
}

const defaultFilters: FilterCriteria = {
  searchTerm: '',
  bloodType: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  status: undefined,
};

export const usePatientFilters = (): UsePatientFiltersResult => {
  const [filters, setFilters] = useState<FilterCriteria>(defaultFilters);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const getQueryParams = useCallback(() => {
    const params: Record<string, string> = {};

    // Use bracket notation for index signature compatibility
    if (filters.searchTerm) {
      params['q'] = filters.searchTerm;
    }
    if (filters.bloodType) {
      params['bloodType'] = filters.bloodType;
    }
    if (filters.dateFrom) {
      params['dateFrom'] = filters.dateFrom;
    }
    if (filters.dateTo) {
      params['dateTo'] = filters.dateTo;
    }
    if (filters.status) {
      params['status'] = filters.status;
    }

    return params;
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    getQueryParams,
  };
};

export default usePatientFilters;
