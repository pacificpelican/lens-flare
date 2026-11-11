import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoDetail, Tag } from '@shared/types';
import apiClient from '../services/api';
import { Button } from '../components/Button.js';
import { ImageEditor } from '../components/ImageEditor.js';
import { ExportDialog, ExportOptions } from '../components/ExportDialog.js';
import { SettingsDialog } from '../components/SettingsDialog.js';
import './PhotoDetailPage.css';

export const PhotoDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { photoId } = useParams<{ photoId: string }>();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [userDescription, setUserDescription] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExifExpanded, setIsExifExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadPhoto();
  }, [photoId]);

  const loadPhoto = async () => {
    if (!photoId) return;
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ success: boolean; data: PhotoDetail }>(`/api/photos/${photoId}`);
      setPhoto(response.data);
      setTitle(response.data.title);
      setUserDescription(response.data.user_description || '');
    } catch (err) {
      setError('Failed to load photo');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!photoId) return;
    try {
      setIsSaving(true);
      await apiClient.put(`/api/photos/${photoId}`, {
        title,
      });
      setPhoto({ ...photo!, title });
    } catch (err) {
      console.error('Failed to save title:', err);
      alert('Failed to save title');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!photoId) return;
    try {
      setIsSaving(true);
      await apiClient.put(`/api/photos/${photoId}`, {
        user_description: userDescription,
      });
      setPhoto({ ...photo!, user_description: userDescription });
    } catch (err) {
      console.error('Failed to save description:', err);
      alert('Failed to save description');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!photoId || !newTag.trim()) return;
    try {
      setIsSaving(true);
      await apiClient.post(`/api/photos/${photoId}/tags`, {
        tag_name: newTag,
      });
      setNewTag('');
      await loadPhoto();
    } catch (err) {
      console.error('Failed to add tag:', err);
      alert('Failed to add tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!photoId) return;
    try {
      await apiClient.delete(`/api/photos/${photoId}/tags/${tagId}`);
      await loadPhoto();
    } catch (err) {
      console.error('Failed to remove tag:', err);
      alert('Failed to remove tag');
    }
  };

  const handleDelete = async () => {
    if (!photoId) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/photos/${photoId}`);
      navigate('/gallery');
    } catch (err) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo');
      setIsDeleting(false);
    }
  };

  const handleEditorSave = async (editedImageBlob: Blob) => {
    if (!photoId) return;
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('file', editedImageBlob, 'edited.jpg');

      await apiClient.post(`/api/photos/${photoId}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowEditor(false);
      await loadPhoto();
      alert('Photo updated successfully!');
    } catch (err) {
      console.error('Failed to save edited photo:', err);
      alert('Failed to save edited photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    if (!photoId) return;
    try {
      const response = await apiClient.post(
        `/api/photos/${photoId}/export`,
        {
          format: options.format,
          quality: options.quality,
        },
        {
          responseType: 'blob' as any,
        }
      );

      // Create blob download
      const url = window.URL.createObjectURL(response as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${photo?.title || 'photo'}-${Date.now()}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  const handleDownloadOriginal = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isDownloading || !photo) return;

    try {
      setIsDownloading(true);
      const blob = await apiClient.get<Blob>(photoUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Download original failed:', error);
      alert('Failed to download original photo');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <div className="photo-detail-loading">Loading photo...</div>;
  }

  if (error || !photo) {
    return (
      <div className="photo-detail-error">
        <p>{error || 'Photo not found'}</p>
        <Button onClick={() => navigate('/gallery')}>Back to Gallery</Button>
      </div>
    );
  }

  const photoUrl = `http://localhost:3000/api/photos/files/${photo.filename}`;

  return (
    <div className="photo-detail-page">
      {/* Header */}
      <header className="photo-detail-header">
        <Button variant="secondary" size="sm" onClick={() => navigate('/gallery')}>
          ← Back
        </Button>
        <div className="header-spacer" />
        <div className="header-button-group">
          <Button variant="primary" size="sm" vertical onClick={() => setShowSettings(true)} title="Settings">
            <span>⚙️</span>
            <span>Settings</span>
          </Button>
          <Button variant="primary" size="sm" vertical onClick={() => setShowExport(true)}>
            <span>⬇️</span>
            <span>Export</span>
          </Button>
          <Button variant="primary" size="sm" vertical onClick={() => setShowEditor(true)}>
            <span>✏️</span>
            <span>Edit</span>
          </Button>
        </div>
      </header>

      <div className="photo-detail-container">
        {/* Left: Photo Viewer */}
        <div className="photo-detail-viewer">
          <img src={photoUrl} alt={photo.title} className="photo-detail-image" />
        </div>

        {/* Right: Details Panel */}
        <div className="photo-detail-panel">
          {/* Title */}
          <div className="photo-detail-section">
            <label className="photo-detail-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="photo-detail-input"
            />
            <Button variant="secondary" size="sm" onClick={handleSaveTitle} disabled={isSaving}>
              Save Title
            </Button>
          </div>

          {/* AI Description */}
          {photo.ai_description && (
            <div className="photo-detail-section">
              <label className="photo-detail-label">AI Description</label>
              <p className="photo-detail-ai-description">{photo.ai_description}</p>
            </div>
          )}

          {/* User Description */}
          <div className="photo-detail-section">
            <label className="photo-detail-label">Your Notes</label>
            <textarea
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder="Add your own description..."
              className="photo-detail-textarea"
              rows={4}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveDescription}
              disabled={isSaving}
            >
              Save Notes
            </Button>
          </div>

          {/* EXIF Data */}
            <div className="photo-detail-section">
              <button 
                className="photo-detail-label photo-detail-collapsible"
                onClick={() => setIsExifExpanded(!isExifExpanded)}
                aria-expanded={isExifExpanded}
              >
                <span className="photo-detail-collapse-arrow">
                  {isExifExpanded ? '▼' : '▶'}
                </span>
                Photo Info
              </button>
              {isExifExpanded && (
                <div className="photo-detail-exif">
                  {photo.exif_data && Object.keys(photo.exif_data).length > 0 ? (
                    Object.entries(photo.exif_data).map(([key, value]) => (
                      <div key={key} className="photo-detail-exif-row">
                        <span className="photo-detail-exif-key">{key}:</span>
                        <span className="photo-detail-exif-value">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))
                  ) : <p>No photo information available.</p>}
                </div>
              )}
            </div>

          {/* Tags */}
          <div className="photo-detail-section">
            <label className="photo-detail-label">Tags</label>
            <div className="photo-detail-tags">
              {photo.tags && photo.tags.length > 0 ? (
                photo.tags.map((tag: Tag) => (
                  <span key={tag.id} className="photo-detail-tag">
                    {tag.tag_name}
                    <button
                      className="photo-detail-tag-remove"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <p className="photo-detail-no-tags">No tags yet</p>
              )}
            </div>

            <div className="photo-detail-add-tag">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="photo-detail-input"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddTag}
                disabled={isSaving || !newTag.trim()}
              >
                Add Tag
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="photo-detail-section">
            <label className="photo-detail-label">File Info</label>
            <div className="photo-detail-metadata">
              <div className="photo-detail-metadata-row">
                <span className="photo-detail-metadata-key">Filename:</span>
                <span className="photo-detail-metadata-value">{photo.filename}</span>
              </div>
              <div className="photo-detail-metadata-row">
                <span className="photo-detail-metadata-key">Uploaded:</span>
                <span className="photo-detail-metadata-value">
                  {new Date(photo.upload_date).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="photo-detail-section">
            <a
              href={photoUrl}
              download={photo.filename}
              className="btn btn-secondary btn-sm photo-detail-download-link"
              onClick={handleDownloadOriginal}
              aria-disabled={isDownloading}
              aria-busy={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download Original'}
            </a>
          </div>

          {/* Delete Button */}
          <div className="photo-detail-section photo-detail-section-danger">
            {showDeleteConfirm ? (
              <div className="photo-detail-confirm">
                <p>Are you sure? This cannot be undone.</p>
                <div className="photo-detail-confirm-buttons">
                  <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete Photo
              </Button>
            )}
          </div>
        </div>
      </div>

      {showEditor && (
        <ImageEditor
          imageUrl={photoUrl}
          onClose={() => setShowEditor(false)}
          onSave={handleEditorSave}
        />
      )}

      <ExportDialog
        isOpen={showExport}
        photoTitle={photo?.title || 'photo'}
        onExport={handleExport}
        onClose={() => setShowExport(false)}
      />

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};
