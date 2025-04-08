import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { patientService, type PatientSearchParams } from '../services/patientService';
import { useDebounce } from '../hooks/useDebounce';

export const Patients: React.FC = () => {
  const [searchParams, setSearchParams] = useState<PatientSearchParams>({
    page: 1,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, error } = useQuery(
    ['patients', searchParams, debouncedSearchTerm],
    () => debouncedSearchTerm
      ? patientService.searchPatients(debouncedSearchTerm, searchParams)
      : patientService.getAllPatients(searchParams),
    {
      keepPreviousData: true,
    }
  );

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setSearchParams(prev => ({ ...prev, page: 1 }));
  };

  if (error) return <div>Error loading patients: {(error as Error).message}</div>;

  return (
    <div className="patients-page">
      <div className="page-header">
        <h1>Patients</h1>
        <Link to="/patients/new" className="add-button">
          Add New Patient
        </Link>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {isLoading ? (
        <div>Loading patients...</div>
      ) : (
        <>
          <div className="patients-grid">
            {data?.data.map(patient => (
              <div key={patient.id} className="patient-card">
                <h3>
                  <Link to={`/patients/${patient.id}`}>
                    {patient.firstName} {patient.lastName}
                  </Link>
                </h3>
                <div className="patient-info">
                  <p>
                    <strong>MRN:</strong> {patient.medicalRecordNumber}
                  </p>
                  <p>
                    <strong>Blood Type:</strong> {patient.bloodType}
                  </p>
                  <p>
                    <strong>DOB:</strong> {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Gender:</strong> {patient.gender}
                  </p>
                </div>
                <div className="patient-actions">
                  <Link to={`/patients/${patient.id}/reports`} className="action-link">
                    Reports
                  </Link>
                  <Link to={`/patients/${patient.id}/caution-cards`} className="action-link">
                    Caution Cards
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {data && data.pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(searchParams.page! - 1)}
                disabled={searchParams.page === 1}
              >
                Previous
              </button>
              <span>
                Page {searchParams.page} of {data.pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(searchParams.page! + 1)}
                disabled={searchParams.page === data.pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 