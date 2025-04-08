import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce'; // Correct path
import { useGlobalSearch } from '../../hooks/useGlobalSearch'; // Correct path

interface SearchResult {
  id: string | number;
  type: 'patient' | 'report' | 'caution-card';
  title: string;
  subtitle?: string;
}

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  // Let TS infer the full result type from the hook
  const { data: results, isLoading } = useGlobalSearch(debouncedQuery);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery(''); // Clear query after selection
    switch (result.type) {
      case 'patient':
        navigate(`/patients/${result.id}`);
        break;
      case 'report':
        // Assuming a route like /reports/:id exists
        navigate(`/reports/${result.id}`);
        break;
      case 'caution-card':
        // Assuming a route like /caution-cards/:id exists
        navigate(`/caution-cards/${result.id}`);
        break;
      default:
        console.warn('Unknown search result type:', result.type);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setIsOpen(event.target.value.length > 0); // Open dropdown when typing
  };

  const handleFocus = () => {
    if (query.length > 0) {
      setIsOpen(true); // Re-open dropdown on focus if there's a query
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search patients, reports..."
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading && <div className="px-4 py-2 text-gray-500">Loading...</div>}
          {/* Check if results is defined and an array before accessing length */}
          {!isLoading &&
            debouncedQuery.length >= 2 &&
            (!results || !Array.isArray(results) || results.length === 0) && (
              <div className="px-4 py-2 text-gray-500">
                No results found for "{debouncedQuery}".
              </div>
            )}
          {/* Check if results is defined and an array before mapping */}
          {!isLoading && results && Array.isArray(results) && results.length > 0 && (
            <ul>
              {/* Add explicit type for result parameter */}
              {results.map((result: SearchResult) => (
                <li
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-gray-500">{result.subtitle}</div>
                  )}
                  <div className="text-xs text-gray-400 uppercase">{result.type}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
