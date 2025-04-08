import React, { useState } from 'react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
    onSearch, 
    placeholder = "Search...",
    className = ""
}) => {
    const [query, setQuery] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        // Optionally implement debounced search here
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit} className={`flex items-center ${className}`}>
            <input 
                type="text" 
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                className="border p-2 rounded flex-grow focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button 
                type="submit" 
                className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Search
            </button>
        </form>
    );
};

export default SearchBar; 