import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Photo, PaginatedResponse } from '@shared/types';
import apiClient from '../services/api';
import { PhotoGrid } from '../components/PhotoGrid';
import { CameraModal } from '../components/CameraModal';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { SettingsDialog } from '../components/SettingsDialog.js';
import { Button } from '../components/Button';
import './GalleryPage.css';

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    search?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    cameraModel?: string;
    iso?: number;
  }>({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [page, activeFilters]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      // Build query string with filters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('perPage', '20');
      
      if (activeFilters.search) params.append('search', activeFilters.search);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.cameraModel) params.append('cameraModel', activeFilters.cameraModel);
      if (activeFilters.iso) params.append('iso', activeFilters.iso.toString());
      if (activeFilters.tags && activeFilters.tags.length > 0) {
        activeFilters.tags.forEach(tag => params.append('tags', tag));
      }

      const response = await apiClient.get<PaginatedResponse<Photo>>(
        `/api/photos?${params.toString()}`
      );
      setPhotos(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      search: query || undefined,
    }));
  };

  const handleApplyFilters = (filters: any) => {
    setPage(1);
    setActiveFilters({
      search: activeFilters.search,
      ...filters,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('title', uploadFile.name.replace(/\.[^/.]+$/, ''));

      const response = await apiClient.post('/api/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh photos
      setUploadFile(null);
      setPage(1);
      await loadPhotos();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('title', `Photo ${new Date().toLocaleString()}`);

      await apiClient.post('/api/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Refresh photos
      setPage(1);
      await loadPhotos();
    } catch (error) {
      console.error('Camera upload failed:', error);
      alert('Failed to save camera photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = (photoId: string) => {
    navigate(`/photo/${photoId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="gallery-page">
      {/* Header */}
      <header className="gallery-header">
        <div className="gallery-header-content">
          <h1 className="gallery-title">Lens Flare</h1>
          <div className="gallery-header-right">
            <button 
              className="gallery-camera-btn"
              onClick={() => setIsCameraOpen(true)}
              title="Take a photo with camera"
            >
              📷
            </button>
            <button 
              className="gallery-settings-btn"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </button>
            <div className="gallery-user-info">
              {user && <span className="gallery-user-email">{user.email}</span>}
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Upload Section */}
      <div className="gallery-upload-section">
        <div className="gallery-upload-container">
          <input
            type="file"
            id="photo-input"
            onChange={handleFileSelect}
            accept="image/*"
            className="gallery-input-hidden"
            disabled={uploading}
          />
          <label htmlFor="photo-input" className="gallery-upload-label">
            {uploadFile ? uploadFile.name : 'Choose photo...'}
          </label>
          <Button onClick={handleUpload} isLoading={uploading} disabled={!uploadFile}>
            Upload
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="gallery-search-section">
        <SearchBar onSearch={handleSearch} placeholder="Search photos..." />
        <button 
          className="gallery-filter-btn"
          onClick={() => setIsFilterOpen(true)}
          title="Open filters"
        >
          🔧 Filters
        </button>
      </div>

      {/* Photo Grid */}
      <PhotoGrid photos={photos} isLoading={isLoading} onPhotoClick={handlePhotoClick} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="gallery-pagination">
          <Button
            variant="secondary"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="gallery-page-info">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Filter Panel */}
      <FilterPanel 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
      />

      {/* Settings Dialog */}
      <SettingsDialog 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};
