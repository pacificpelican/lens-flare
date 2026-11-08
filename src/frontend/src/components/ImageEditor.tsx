import React, { useRef, useState, useEffect } from 'react';
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageBlob: Blob) => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'blur' | 'sharpen';

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<FilterType>('none');
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setIsLoading(false);
      drawImage(img, 100, 100, 'none', 0, 1, null);
    };
    img.onerror = () => {
      setIsLoading(false);
      console.error('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const drawImage = (
    img: HTMLImageElement,
    brightness: number,
    contrast: number,
    filter: FilterType,
    rotation: number,
    scale: number,
    cropRect: { x: number; y: number; width: number; height: number } | null
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const displayWidth = Math.min(img.width * scale, 600);
    const displayHeight = (displayWidth / img.width) * img.height;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save and apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    if (cropRect) {
      ctx.drawImage(
        img,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Apply brightness and contrast
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const brightnessMultiplier = brightness / 100;
    const contrastMultiplier = (contrast - 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      if (i % 4 === 3) continue; // Skip alpha channel

      let value = data[i] * brightnessMultiplier;
      value = value + contrastMultiplier * (value - 128);
      data[i] = Math.min(255, Math.max(0, value));
    }

    // Apply filter
    if (filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else if (filter === 'sepia') {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
    } else if (filter === 'blur') {
      // Simple blur using box filter
      const imageDataCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const blurred = applyBoxBlur(imageData, canvas.width, canvas.height, 3);
      ctx.putImageData(blurred, 0, 0);
      ctx.restore();
      return;
    } else if (filter === 'sharpen') {
      // Sharpen filter
      const sharpened = applySharpen(imageData, canvas.width, canvas.height);
      ctx.putImageData(sharpened, 0, 0);
      ctx.restore();
      return;
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  };

  const applyBoxBlur = (
    imageData: ImageData,
    width: number,
    height: number,
    radius: number
  ): ImageData => {
    const data = imageData.data;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = Math.min(width - 1, Math.max(0, x + dx));
            const py = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (py * width + px) * 4;

            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        outData[idx] = r / count;
        outData[idx + 1] = g / count;
        outData[idx + 2] = b / count;
        outData[idx + 3] = a / count;
      }
    }

    return output;
  };

  const applySharpen = (imageData: ImageData, width: number, height: number): ImageData => {
    const data = imageData.data;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Sharpen kernel
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0,
          g = 0,
          b = 0;
        let k = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            r += data[idx] * kernel[k];
            g += data[idx + 1] * kernel[k];
            b += data[idx + 2] * kernel[k];
            k++;
          }
        }

        const idx = (y * width + x) * 4;
        outData[idx] = Math.min(255, Math.max(0, r / 9));
        outData[idx + 1] = Math.min(255, Math.max(0, g / 9));
        outData[idx + 2] = Math.min(255, Math.max(0, b / 9));
        outData[idx + 3] = data[idx + 3];
      }
    }

    return output;
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    if (image) drawImage(image, value, contrast, filter, rotation, scale, null);
  };

  const handleContrastChange = (value: number) => {
    setContrast(value);
    if (image) drawImage(image, brightness, value, filter, rotation, scale, null);
  };

  const handleRotation = (degrees: number) => {
    const newRotation = (rotation + degrees) % 360;
    setRotation(newRotation);
    if (image) drawImage(image, brightness, contrast, filter, newRotation, scale, null);
  };

  const handleFlip = () => {
    handleRotation(180);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (image) drawImage(image, brightness, contrast, newFilter, rotation, scale, null);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    setFilter('none');
    setCropMode(false);
    setCropStart(null);
    setCropEnd(null);
    setScale(1);
    if (image) drawImage(image, 100, 100, 'none', 0, 1, null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
      }, 'image/jpeg', 0.95);
    } finally {
      setIsSaving(false);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newScale = direction === 'in' ? Math.min(2, scale + 0.2) : Math.max(0.5, scale - 0.2);
    setScale(newScale);
    if (image) drawImage(image, brightness, contrast, filter, rotation, newScale, null);
  };

  if (isLoading) {
    return (
      <div className="image-editor-overlay">
        <div className="image-editor">
          <div className="editor-loading">Loading image...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-editor-overlay">
      <div className="image-editor">
        <div className="editor-header">
          <h2>Edit Photo</h2>
          <button className="editor-close" onClick={onClose} title="Close editor">
            ✕
          </button>
        </div>

        <div className="editor-content">
          <div className="editor-canvas-wrapper">
            <canvas ref={canvasRef} className="editor-canvas" />
          </div>

          <div className="editor-toolbar">
            <div className="toolbar-section">
              <h4>Adjustments</h4>

              <div className="slider-group">
                <label>Brightness</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{brightness}%</span>
              </div>

              <div className="slider-group">
                <label>Contrast</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => handleContrastChange(Number(e.target.value))}
                  className="slider"
                />
                <span className="slider-value">{contrast}%</span>
              </div>

              <div className="slider-group">
                <label>Zoom</label>
                <div className="zoom-buttons">
                  <button
                    className="tool-button"
                    onClick={() => handleZoom('out')}
                    title="Zoom out"
                  >
                    −
                  </button>
                  <span className="zoom-value">{Math.round(scale * 100)}%</span>
                  <button className="tool-button" onClick={() => handleZoom('in')} title="Zoom in">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="toolbar-section">
              <h4>Rotate & Flip</h4>
              <div className="button-group">
                <button className="tool-button" onClick={() => handleRotation(-90)} title="Rotate left">
                  ↺ 90°
                </button>
                <button className="tool-button" onClick={() => handleRotation(90)} title="Rotate right">
                  ↻ 90°
                </button>
                <button className="tool-button" onClick={handleFlip} title="Flip">
                  ⇄ Flip
                </button>
              </div>
            </div>

            <div className="toolbar-section">
              <h4>Filters</h4>
              <div className="filter-buttons">
                <button
                  className={`filter-button ${filter === 'none' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('none')}
                >
                  None
                </button>
                <button
                  className={`filter-button ${filter === 'grayscale' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('grayscale')}
                >
                  B&W
                </button>
                <button
                  className={`filter-button ${filter === 'sepia' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sepia')}
                >
                  Sepia
                </button>
                <button
                  className={`filter-button ${filter === 'blur' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('blur')}
                >
                  Blur
                </button>
                <button
                  className={`filter-button ${filter === 'sharpen' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sharpen')}
                >
                  Sharp
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset
          </button>
          <div className="footer-spacer" />
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
