import React, { useState, useContext } from 'react';
import { useLinkCautionCardToPatient } from '../../hooks/useCautionCards'; // Correct hook name
import { useSearchPatients } from '../../hooks/usePatients'; // Correct path
import { AuthContext } from '../../context/AuthContext'; // Correct path
import { useDebounce } from '../../hooks/useDebounce'; // Correct path
import { Patient } from '../../types/patient'; // Patient type

interface LinkCardToPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string | number | null;
  cardIdentifier?: string; // Display name/file for context
}

export const LinkCardToPatientModal: React.FC<LinkCardToPatientModalProps> = ({
  isOpen,
  onClose,
  cardId,
  cardIdentifier,
}) => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('LinkCardToPatientModal must be used within an AuthProvider');
  }
  const { user } = authContext;
  const linkMutation = useLinkCautionCardToPatient(); // Correct hook name

  // State for patient search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search input
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Use patient search hook
  const { data: searchResults, isLoading: isSearching } = useSearchPatients(
    debouncedSearchTerm,
    {}, // No extra options for now
    debouncedSearchTerm.length > 1 // Only enable when search term is long enough
  );

  const handleLink = () => {
    // Ensure cardId is a valid number before attempting to link
    if (typeof cardId === 'number' && !isNaN(cardId) && selectedPatient?.id && user?.username) {
      // Use user.name
      linkMutation.mutate(
        { id: cardId, data: { patientId: selectedPatient.id, updatedBy: user.username } }, // Pass validated cardId and structured data matching hook expectation
        {
          onSuccess: () => {
            console.log('Card linked successfully');
            resetState();
            onClose();
            // TODO: Success notification
          },
          onError: (error: Error) => {
            // Add Error type
            console.error('Linking failed:', error);
            // TODO: Show error in modal
          },
        }
      );
    }
  };

  const resetState = () => {
    setSearchTerm('');
    setSelectedPatient(null);
    linkMutation.reset();
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen || !cardId) return null;

  const patientsFound = searchResults?.data || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-xl w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-xl font-semibold">Link Card {cardIdentifier || cardId}</h3>
          <button onClick={onClose} className="text-black opacity-50 hover:opacity-100 text-2xl">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4">
          <p>Search for the patient to link this caution card to:</p>

          {/* Patient Search Input */}
          <div>
            <label htmlFor="patientSearch" className="block text-sm font-medium text-gray-700">
              Search by Name or MRN
            </label>
            <input
              id="patientSearch"
              type="text"
              placeholder="Start typing..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Search Results */}
          <div className="search-results max-h-60 overflow-y-auto border rounded p-2">
            {isSearching && <p className="text-gray-500">Searching...</p>}
            {!isSearching && debouncedSearchTerm.length > 1 && patientsFound.length === 0 && (
              <p className="text-gray-500">No patients found matching "{debouncedSearchTerm}".</p>
            )}
            {!isSearching && patientsFound.length > 0 && (
              <ul className="divide-y divide-gray-200">
                {patientsFound.map(
                  (
                    p: Patient // Add Patient type
                  ) => (
                    <li
                      key={p.id}
                      className={`p-2 cursor-pointer hover:bg-gray-100 ${
                        selectedPatient?.id === p.id ? 'bg-indigo-100' : ''
                      }`}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <span className="font-medium">
                        {p.demographics.lastName}, {p.demographics.firstName}
                      </span>{' '}
                      ({p.identification.mrn || 'No MRN'}) - DOB:{' '}
                      {p.demographics.dateOfBirth || 'N/A'}
                    </li>
                  )
                )}
              </ul>
            )}
            {!isSearching && debouncedSearchTerm.length <= 1 && (
              <p className="text-gray-400 italic">Enter at least 2 characters to search.</p>
            )}
          </div>

          {/* Selected Patient Display */}
          {selectedPatient && (
            <div className="mt-2 p-2 border rounded bg-green-50 border-green-200">
              Selected:{' '}
              <span className="font-semibold">
                {selectedPatient.demographics.lastName}, {selectedPatient.demographics.firstName}
              </span>{' '}
              (ID: {selectedPatient.id})
            </div>
          )}

          {/* Linking Error Display */}
          {linkMutation.isError && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
              Error Linking: {(linkMutation.error as Error)?.message || 'Failed to link card'}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            disabled={linkMutation.isPending} // Use isPending for v5
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            className="bg-green-600 text-white active:bg-green-700 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 disabled:opacity-50"
            disabled={!selectedPatient || linkMutation.isPending} // Use isPending for v5
          >
            {linkMutation.isPending ? 'Linking...' : 'Link to Patient'} // Use isPending for v5
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkCardToPatientModal;
