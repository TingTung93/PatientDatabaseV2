import React, { useState } from 'react';
import { Patient } from '../../types/patient';

interface PatientSearchProps {
  onSearch: (query: string) => Promise<{
    patients: Patient[];
    total: number;
  }>;
  onSelect?: (patient: Patient) => void;
  isLoading?: boolean;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
  onSearch,
  onSelect,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);

  const handleSearch = async () => {
    if (onSearch && searchQuery.trim()) {
      try {
        const result = await onSearch(searchQuery);
        setSearchResults(result.patients);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      }
    }
  };

  return (
    <div className="patient-search">
      <div className="search-form">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, MRN, or date of birth"
          disabled={isLoading}
        />
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="search-results">
        {searchResults.map((patient) => (
          <div
            key={patient.identification.id}
            className="patient-item"
            onClick={() => onSelect?.(patient)}
          >
            <h3>{patient.demographics.firstName} {patient.demographics.lastName}</h3>
            <p>MRN: {patient.identification.mrn}</p>
            <p>DOB: {patient.demographics.dateOfBirth}</p>
            <p>Blood Type: {patient.bloodProfile.abo} {patient.bloodProfile.rh}</p>
          </div>
        ))}
        {searchResults.length === 0 && searchQuery && !isLoading && (
          <p>No patients found</p>
        )}
      </div>
    </div>
  );
}; 