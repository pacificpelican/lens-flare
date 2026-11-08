import React, { useState } from 'react';
import { Button } from './Button.js';
import './ExportDialog.css';

export interface ExportOptions {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  quality: number;
}

interface ExportDialogProps {
  isOpen: boolean;
  photoTitle: string;
  onExport: (options: ExportOptions) => Promise<void>;
  onClose: () => void;
}

const FORMAT_INFO: Record<ExportOptions['format'], { label: string; description: string; supportedQualities: boolean }> = {
  jpeg: {
    label: 'JPEG',
    description: 'Compressed format, smallest file size. Best for photos.',
    supportedQualities: true,
  },
  png: {
    label: 'PNG',
    description: 'Lossless format, supports transparency. Good for graphics.',
    supportedQualities: false,
  },
  webp: {
    label: 'WebP',
    description: 'Modern format with excellent compression. Best file size for quality.',
    supportedQualities: true,
  },
  avif: {
    label: 'AVIF',
    description: 'Next-gen format, superior compression. Requires modern browser.',
    supportedQualities: true,
  },
  tiff: {
    label: 'TIFF',
    description: 'Uncompressed or lossless, archival quality. Larger files.',
    supportedQualities: false,
  },
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  photoTitle,
  onExport,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportOptions['format']>('jpeg');
  const [quality, setQuality] = useState(80);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport({ format, quality });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-header">
          <h2>Export Photo</h2>
          <button className="export-close" onClick={onClose}>✕</button>
        </div>

        <div className="export-content">
          {/* Format Selection */}
          <div className="export-section">
            <h3>Format</h3>
            <div className="export-formats">
              {(Object.entries(FORMAT_INFO) as Array<[ExportOptions['format'], typeof FORMAT_INFO[keyof typeof FORMAT_INFO]]>).map(
                ([fmt, info]) => (
                  <div
                    key={fmt}
                    className={`export-format-card ${format === fmt ? 'active' : ''}`}
                    onClick={() => setFormat(fmt)}
                  >
                    <div className="format-name">{info.label}</div>
                    <div className="format-description">{info.description}</div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Quality Slider */}
          {FORMAT_INFO[format].supportedQualities && (
            <div className="export-section">
              <h3>Quality</h3>
              <div className="quality-control">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="quality-slider"
                />
                <span className="quality-value">{quality}%</span>
              </div>
              <div className="quality-labels">
                <span>Lower quality, smaller file</span>
                <span>Higher quality, larger file</span>
              </div>
            </div>
          )}

          {/* File Preview Info */}
          <div className="export-section export-info">
            <p>
              📥 <strong>Filename:</strong> {photoTitle || 'photo'}-[timestamp].{FORMAT_INFO[format].label.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="export-footer">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} isLoading={isExporting}>
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};
