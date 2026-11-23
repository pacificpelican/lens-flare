import React, { useEffect, useState } from 'react';
import { MAX_WATERMARK_LENGTH } from '@shared/export-options';
import { Button } from './Button.js';
import './ExportDialog.css';

export interface ExportOptions {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff';
  quality: number;
  watermarkText: string;
  resize?: { width: number; height: number };
}

interface ExportDialogProps {
  isOpen: boolean;
  photoTitle: string;
  imageUrl: string;
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
  imageUrl,
  onExport,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportOptions['format']>('jpeg');
  const [quality, setQuality] = useState(80);
  const [watermarkText, setWatermarkText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');

  // Load the photo's dimensions each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setOriginalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setResizeWidth(String(img.naturalWidth));
      setResizeHeight(String(img.naturalHeight));
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [isOpen, imageUrl]);

  // Edit one dimension and derive the other from the original aspect ratio
  const handleDimensionChange = (axis: 'width' | 'height', raw: string) => {
    if (!originalSize) return;
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setResizeWidth('');
      setResizeHeight('');
      return;
    }
    const max = originalSize[axis];
    const value = Math.min(max, Math.max(1, parseInt(digits, 10)));
    if (axis === 'width') {
      setResizeWidth(String(value));
      setResizeHeight(String(Math.max(1, Math.round((value * originalSize.height) / originalSize.width))));
    } else {
      setResizeHeight(String(value));
      setResizeWidth(String(Math.max(1, Math.round((value * originalSize.width) / originalSize.height))));
    }
  };

  const resetResize = () => {
    if (!originalSize) return;
    setResizeWidth(String(originalSize.width));
    setResizeHeight(String(originalSize.height));
  };

  const parsedWidth = parseInt(resizeWidth, 10);
  const parsedHeight = parseInt(resizeHeight, 10);
  const isResized =
    !!originalSize &&
    parsedWidth > 0 &&
    parsedHeight > 0 &&
    (parsedWidth !== originalSize.width || parsedHeight !== originalSize.height);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExport({
        format,
        quality,
        watermarkText,
        resize: isResized ? { width: parsedWidth, height: parsedHeight } : undefined,
      });
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

          <div className="export-section">
            <label htmlFor="watermark-text" className="export-label">Watermark (optional)</label>
            <input
              id="watermark-text"
              type="text"
              className="export-watermark-input"
              maxLength={MAX_WATERMARK_LENGTH}
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g., Your Name Photography"
            />
            <p className="export-watermark-help">Text appears in the bottom-right corner of the exported photo.</p>
          </div>

          <div className="export-section">
            <label htmlFor="resize-width" className="export-label">Resize (optional)</label>
            {originalSize ? (
              <>
                <div className="export-resize-controls">
                  <input
                    id="resize-width"
                    type="text"
                    inputMode="numeric"
                    className="export-resize-input"
                    aria-label="Width in pixels"
                    value={resizeWidth}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                  />
                  <span className="export-resize-separator">×</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="export-resize-input"
                    aria-label="Height in pixels"
                    value={resizeHeight}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                  />
                  <span className="export-resize-unit">px</span>
                  <button
                    type="button"
                    className="export-resize-reset"
                    onClick={resetResize}
                    disabled={!isResized}
                  >
                    Reset
                  </button>
                </div>
                <p className="export-watermark-help">
                  Original: {originalSize.width} × {originalSize.height} px. Changing one value adjusts the other to keep the photo proportional.
                </p>
              </>
            ) : (
              <p className="export-watermark-help">Loading dimensions…</p>
            )}
          </div>

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
