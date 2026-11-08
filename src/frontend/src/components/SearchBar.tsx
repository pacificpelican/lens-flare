import React, { useState } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = 'Search by title or description...' }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
      />
      {query && (
        <button className="search-clear" onClick={handleClear} title="Clear search">
          ✕
        </button>
      )}
      <span className="search-icon">🔍</span>
    </div>
  );
};
