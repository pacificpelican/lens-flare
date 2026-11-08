import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import './FilterPanel.css';

interface FilterOptions {
  cameras: Array<{ make?: string; model?: string }>;
  isoValues: number[];
  tags: string[];
  dateRange: { earliest: string; latest: string } | null;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: {
    tags?: string[];
    startDate?: string;
    endDate?: string;
    cameraModel?: string;
    iso?: number;
  }) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, onApplyFilters }) => {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedIso, setSelectedIso] = useState<number | undefined>();
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen]);

  const loadFilterOptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: FilterOptions }>(
        '/api/photos/options/filters'
      );
      setOptions(response.data);
      if (response.data.dateRange) {
        setStartDate(response.data.dateRange.earliest.split('T')[0]);
        setEndDate(response.data.dateRange.latest.split('T')[0]);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApplyFilters = () => {
    onApplyFilters({
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      iso: selectedIso,
      cameraModel: selectedCamera,
      startDate,
      endDate,
    });
    onClose();
  };

  const handleResetFilters = () => {
    setSelectedTags([]);
    setSelectedIso(undefined);
    setSelectedCamera(undefined);
    setStartDate(options?.dateRange?.earliest.split('T')[0]);
    setEndDate(options?.dateRange?.latest.split('T')[0]);
    onApplyFilters({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="filter-overlay" onClick={onClose} />
      <div className="filter-panel">
        <div className="filter-header">
          <h3>Filters</h3>
          <button className="filter-close" onClick={onClose} title="Close filters">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="filter-loading">Loading options...</div>
        ) : (
          <div className="filter-content">
            {/* Date Range */}
            {options?.dateRange && (
              <div className="filter-section">
                <h4>Date Range</h4>
                <div className="filter-date-range">
                  <input
                    type="date"
                    value={startDate || ''}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="filter-date-input"
                  />
                  <span className="filter-date-separator">to</span>
                  <input
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="filter-date-input"
                  />
                </div>
              </div>
            )}

            {/* Camera Model */}
            {options?.cameras && options.cameras.length > 0 && (
              <div className="filter-section">
                <h4>Camera</h4>
                <div className="filter-select">
                  <select
                    value={selectedCamera || ''}
                    onChange={(e) => setSelectedCamera(e.target.value || undefined)}
                  >
                    <option value="">All cameras</option>
                    {options.cameras.map((camera, idx) => {
                      const label = camera.make || camera.model || 'Unknown';
                      return (
                        <option key={idx} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* ISO */}
            {options?.isoValues && options.isoValues.length > 0 && (
              <div className="filter-section">
                <h4>ISO</h4>
                <div className="filter-select">
                  <select
                    value={selectedIso || ''}
                    onChange={(e) => setSelectedIso(e.target.value ? parseInt(e.target.value) : undefined)}
                  >
                    <option value="">All ISO values</option>
                    {options.isoValues.map((iso) => (
                      <option key={iso} value={iso}>
                        {iso}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tags */}
            {options?.tags && options.tags.length > 0 && (
              <div className="filter-section">
                <h4>Tags</h4>
                <div className="filter-tags">
                  {options.tags.map((tag) => (
                    <button
                      key={tag}
                      className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="filter-footer">
          <button className="btn btn-secondary" onClick={handleResetFilters}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={handleApplyFilters}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};
