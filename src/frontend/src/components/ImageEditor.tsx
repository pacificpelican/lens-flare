import React, { useRef, useState, useEffect, useCallback } from 'react';
import './ImageEditor.css';

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageBlob: Blob) => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'blur' | 'sharpen';

interface EditState {
  brightness: number;
  contrast: number;
  rotation: number;
  filter: FilterType;
  saturation: number;
  hue: number;
  scale: number;
  cropRect: { x: number; y: number; width: number; height: number } | null;
}

interface HistoryEntry {
  state: EditState;
  timestamp: number;
}

interface CropSelectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Current edit state
  const [currentState, setCurrentState] = useState<EditState>({
    brightness: 100,
    contrast: 100,
    rotation: 0,
    filter: 'none',
    saturation: 100,
    hue: 0,
    scale: 1,
    cropRect: null,
  });

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Crop mode
  const [cropMode, setCropMode] = useState(false);
  const [cropSelect, setCropSelect] = useState<CropSelectRect | null>(null);
  const [isSelectingCrop, setIsSelectingCrop] = useState(false);

  // Aspect ratio for crop
  const [cropAspectRatio, setCropAspectRatio] = useState<'free' | '1:1' | '16:9' | '4:3'>('free');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      const initialState: EditState = { ...currentState };
      // Set state first, then draw after state is updated
      setHistory([{ state: initialState, timestamp: Date.now() }]);
      setHistoryIndex(0);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      console.error('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw image whenever image or current state changes
  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage(image, currentState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, currentState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          redo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
      if (e.key === 'Escape' && cropMode) {
        setCropMode(false);
        setIsSelectingCrop(false);
        setCropSelect(null);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [cropMode, historyIndex]);

  const addToHistory = (newState: EditState) => {
    // Remove any redo history when making new edits
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ state: newState, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = history[newIndex].state;
      setCurrentState(previousState);
      if (image) drawImage(image, previousState);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex].state;
      setCurrentState(nextState);
      if (image) drawImage(image, nextState);
    }
  };

  const updateState = (updates: Partial<EditState>) => {
    const newState = { ...currentState, ...updates };
    setCurrentState(newState);
    if (image) drawImage(image, newState);
    addToHistory(newState);
  };

  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return [h * 360, s * 100, l * 100];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h = h % 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };

  const drawImage = (img: HTMLImageElement, state: EditState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const displayWidth = Math.min(img.width * state.scale, 600);
    const displayHeight = (displayWidth / img.width) * img.height;
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save and apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    if (state.cropRect) {
      ctx.drawImage(
        img,
        state.cropRect.x,
        state.cropRect.y,
        state.cropRect.width,
        state.cropRect.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const brightnessMultiplier = state.brightness / 100;
    const contrastMultiplier = (state.contrast - 100) / 100;
    const saturationMultiplier = state.saturation / 100;
    const hueShift = state.hue;

    // Apply adjustments to each pixel
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply brightness
      r *= brightnessMultiplier;
      g *= brightnessMultiplier;
      b *= brightnessMultiplier;

      // Apply contrast
      r = r + contrastMultiplier * (r - 128);
      g = g + contrastMultiplier * (g - 128);
      b = b + contrastMultiplier * (b - 128);

      // Apply saturation
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray + (r - gray) * saturationMultiplier;
      g = gray + (g - gray) * saturationMultiplier;
      b = gray + (b - gray) * saturationMultiplier;

      // Apply hue shift
      if (hueShift !== 0) {
        const hsl = rgbToHsl(r, g, b);
        hsl[0] = (hsl[0] + hueShift) % 360;
        const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    // Apply filter
    if (state.filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else if (state.filter === 'sepia') {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
    } else if (state.filter === 'blur') {
      const blurred = applyBoxBlur(imageData, canvas.width, canvas.height, 3);
      ctx.putImageData(blurred, 0, 0);
      ctx.restore();
      return;
    } else if (state.filter === 'sharpen') {
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

  const drawCropOverlay = () => {
    if (!cropMode || !cropCanvasRef.current || !image) return;

    const canvas = cropCanvasRef.current;
    canvas.width = 600;
    canvas.height = (600 / image.width) * image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (cropSelect) {
      // Draw clear crop area
      ctx.clearRect(cropSelect.x, cropSelect.y, cropSelect.width, cropSelect.height);

      // Draw border around crop area
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropSelect.x, cropSelect.y, cropSelect.width, cropSelect.height);

      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(cropSelect.x - handleSize / 2, cropSelect.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropSelect.x + cropSelect.width - handleSize / 2, cropSelect.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropSelect.x - handleSize / 2, cropSelect.y + cropSelect.height - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(
        cropSelect.x + cropSelect.width - handleSize / 2,
        cropSelect.y + cropSelect.height - handleSize / 2,
        handleSize,
        handleSize
      );
    }
  };

  useEffect(() => {
    drawCropOverlay();
  }, [cropMode, cropSelect, image]);

  const handleCropStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;
    const rect = cropCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropSelect({ x, y, width: 0, height: 0 });
    setIsSelectingCrop(true);
  };

  const handleCropMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingCrop || !cropSelect) return;

    const rect = cropCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let width = x - cropSelect.x;
    let height = y - cropSelect.y;

    // Apply aspect ratio constraint
    if (cropAspectRatio !== 'free') {
      const ratios: Record<string, number> = { '1:1': 1, '16:9': 16 / 9, '4:3': 4 / 3 };
      const ratio = ratios[cropAspectRatio];

      if (Math.abs(width) / Math.abs(height) > ratio) {
        height = width / ratio;
      } else {
        width = height * ratio;
      }
    }

    setCropSelect((prev) => ({
      ...prev!,
      width,
      height,
    }));
  };

  const handleCropEnd = () => {
    setIsSelectingCrop(false);
  };

  const applyCrop = () => {
    if (!cropSelect || !image) return;

    // Convert canvas coordinates to image coordinates
    const scale = image.width / 600;
    const cropRect = {
      x: Math.max(0, cropSelect.x * scale),
      y: Math.max(0, cropSelect.y * scale),
      width: Math.min(image.width, cropSelect.width * scale),
      height: Math.min(image.height, cropSelect.height * scale),
    };

    updateState({ cropRect });
    setCropMode(false);
    setCropSelect(null);
  };

  const handleRotation = (degrees: number) => {
    const newRotation = (currentState.rotation + degrees) % 360;
    updateState({ rotation: newRotation });
  };

  const handleReset = () => {
    const resetState: EditState = {
      brightness: 100,
      contrast: 100,
      rotation: 0,
      filter: 'none',
      saturation: 100,
      hue: 0,
      scale: 1,
      cropRect: null,
    };
    setCurrentState(resetState);
    if (image) drawImage(image, resetState);
    setHistory([{ state: resetState, timestamp: Date.now() }]);
    setHistoryIndex(0);
    setCropMode(false);
    setCropSelect(null);
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
    const newScale = direction === 'in' ? Math.min(2, currentState.scale + 0.2) : Math.max(0.5, currentState.scale - 0.2);
    updateState({ scale: newScale });
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="image-editor-overlay">
      <div className="image-editor">
        <div className="editor-header">
          <h2>Edit Photo</h2>
          <div className="header-actions">
            <button
              className="editor-history-btn"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              className="editor-history-btn"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
          <button className="editor-close" onClick={onClose} title="Close editor">
            ✕
          </button>
        </div>

        <div className="editor-content">
          <div className="editor-canvas-wrapper">
            {cropMode ? (
              <canvas
                ref={cropCanvasRef}
                className="editor-canvas crop-mode"
                onMouseDown={handleCropStart}
                onMouseMove={handleCropMove}
                onMouseUp={handleCropEnd}
                onMouseLeave={handleCropEnd}
              />
            ) : (
              <canvas ref={canvasRef} className="editor-canvas" />
            )}
          </div>

          <div className="editor-toolbar">
            {/* Crop Mode UI */}
            {cropMode && (
              <div className="toolbar-section crop-section">
                <h4>Crop Image</h4>
                <div className="aspect-ratio-buttons">
                  <button
                    className={`aspect-btn ${cropAspectRatio === 'free' ? 'active' : ''}`}
                    onClick={() => setCropAspectRatio('free')}
                  >
                    Free
                  </button>
                  <button
                    className={`aspect-btn ${cropAspectRatio === '1:1' ? 'active' : ''}`}
                    onClick={() => setCropAspectRatio('1:1')}
                  >
                    1:1
                  </button>
                  <button
                    className={`aspect-btn ${cropAspectRatio === '16:9' ? 'active' : ''}`}
                    onClick={() => setCropAspectRatio('16:9')}
                  >
                    16:9
                  </button>
                  <button
                    className={`aspect-btn ${cropAspectRatio === '4:3' ? 'active' : ''}`}
                    onClick={() => setCropAspectRatio('4:3')}
                  >
                    4:3
                  </button>
                </div>
                <button
                  className="btn btn-primary btn-full"
                  onClick={applyCrop}
                  disabled={!cropSelect || (cropSelect.width === 0 && cropSelect.height === 0)}
                >
                  Apply Crop
                </button>
              </div>
            )}

            {/* Adjustments */}
            {!cropMode && (
              <>
                <div className="toolbar-section">
                  <h4>Adjustments</h4>

                  <div className="slider-group">
                    <label>Brightness</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={currentState.brightness}
                      onChange={(e) => updateState({ brightness: Number(e.target.value) })}
                      className="slider"
                    />
                    <span className="slider-value">{currentState.brightness}%</span>
                  </div>

                  <div className="slider-group">
                    <label>Contrast</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={currentState.contrast}
                      onChange={(e) => updateState({ contrast: Number(e.target.value) })}
                      className="slider"
                    />
                    <span className="slider-value">{currentState.contrast}%</span>
                  </div>

                  <div className="slider-group">
                    <label>Saturation</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={currentState.saturation}
                      onChange={(e) => updateState({ saturation: Number(e.target.value) })}
                      className="slider"
                    />
                    <span className="slider-value">{currentState.saturation}%</span>
                  </div>

                  <div className="slider-group">
                    <label>Hue Shift</label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={currentState.hue}
                      onChange={(e) => updateState({ hue: Number(e.target.value) })}
                      className="slider"
                    />
                    <span className="slider-value">{currentState.hue}°</span>
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
                      <span className="zoom-value">{Math.round(currentState.scale * 100)}%</span>
                      <button className="tool-button" onClick={() => handleZoom('in')} title="Zoom in">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="toolbar-section">
                  <h4>Transform</h4>
                  <div className="button-group">
                    <button
                      className="tool-button"
                      onClick={() => handleRotation(-90)}
                      title="Rotate left"
                    >
                      ↺ 90°
                    </button>
                    <button
                      className="tool-button"
                      onClick={() => handleRotation(90)}
                      title="Rotate right"
                    >
                      ↻ 90°
                    </button>
                  </div>
                  <button
                    className="tool-button btn-full"
                    onClick={() => setCropMode(true)}
                    title="Crop image"
                  >
                    ✂️ Crop
                  </button>
                </div>

                <div className="toolbar-section">
                  <h4>Filters</h4>
                  <div className="filter-buttons">
                    <button
                      className={`filter-button ${currentState.filter === 'none' ? 'active' : ''}`}
                      onClick={() => updateState({ filter: 'none' })}
                    >
                      None
                    </button>
                    <button
                      className={`filter-button ${currentState.filter === 'grayscale' ? 'active' : ''}`}
                      onClick={() => updateState({ filter: 'grayscale' })}
                    >
                      B&W
                    </button>
                    <button
                      className={`filter-button ${currentState.filter === 'sepia' ? 'active' : ''}`}
                      onClick={() => updateState({ filter: 'sepia' })}
                    >
                      Sepia
                    </button>
                    <button
                      className={`filter-button ${currentState.filter === 'blur' ? 'active' : ''}`}
                      onClick={() => updateState({ filter: 'blur' })}
                    >
                      Blur
                    </button>
                    <button
                      className={`filter-button ${currentState.filter === 'sharpen' ? 'active' : ''}`}
                      onClick={() => updateState({ filter: 'sharpen' })}
                    >
                      Sharp
                    </button>
                  </div>
                </div>
              </>
            )}
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
