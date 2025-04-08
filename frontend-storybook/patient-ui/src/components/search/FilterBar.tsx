import React, { useState } from 'react';
import SearchBar from './SearchBar';

export interface FilterCriteria {
  searchTerm: string;
  // Explicitly allow undefined for optional fields
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  status?: 'Active' | 'Inactive' | 'Pending' | undefined;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterCriteria) => void;
  className?: string;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'];

export const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange, className = '' }) => {
  const [filters, setFilters] = useState<FilterCriteria>({
    searchTerm: '',
    // Set optional fields explicitly to undefined
    bloodType: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
  });

  const handleSearchChange = (query: string) => {
    const newFilters = { ...filters, searchTerm: query };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Adjust types for handleFilterChange
  const handleFilterChange = (
    field: keyof Omit<FilterCriteria, 'searchTerm'>, // Exclude searchTerm as it's handled separately
    value: string
  ) => {
    // Cast value based on field type
    let typedValue: FilterCriteria[typeof field] | undefined = value || undefined;
    if (field === 'bloodType') {
      typedValue = value as FilterCriteria['bloodType'];
    } else if (field === 'status') {
      typedValue = value as FilterCriteria['status'];
    }

    const newFilters = { ...filters, [field]: typedValue };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterCriteria = {
      searchTerm: '',
      // Set optional fields explicitly to undefined
      bloodType: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-4">
        <div className="flex-grow">
          <SearchBar
            onSearch={handleSearchChange}
            placeholder="Search patients..."
            className="w-full"
          />
        </div>

        <select
          value={filters.bloodType || ''}
          onChange={e => handleFilterChange('bloodType', e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Blood Type</option>
          {BLOOD_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Status</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date From:</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date To:</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleReset}
          className="ml-auto bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
