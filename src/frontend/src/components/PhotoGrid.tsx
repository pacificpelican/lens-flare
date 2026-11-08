import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '@shared/types';
import apiClient from '../../services/api';
import './PhotoGrid.css';

interface PhotoGridProps {
  photos: Photo[];
  isLoading: boolean;
  onPhotoClick: (photoId: string) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, isLoading, onPhotoClick }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Generate URLs for each photo
    const urls: Record<string, string> = {};
    photos.forEach((photo) => {
      urls[photo.id] = `http://localhost:3000/api/photos/files/${photo.filename}`;
    });
    setPhotoUrls(urls);
  }, [photos]);

  if (isLoading) {
    return <div className="photo-grid-loading">Loading photos...</div>;
  }

  if (photos.length === 0) {
    return <div className="photo-grid-empty">No photos yet. Upload one to get started!</div>;
  }

  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="photo-grid-item"
          onMouseEnter={() => setHoveredId(photo.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onPhotoClick(photo.id)}
        >
          <img
            src={photoUrls[photo.id]}
            alt={photo.title}
            className="photo-grid-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />

          {hoveredId === photo.id && (
            <div className="photo-grid-overlay">
              <div className="photo-grid-info">
                <h3 className="photo-grid-title">{photo.title}</h3>
                {photo.upload_date && (
                  <p className="photo-grid-date">{new Date(photo.upload_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
