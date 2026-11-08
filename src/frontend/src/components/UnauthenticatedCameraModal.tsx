import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import './UnauthenticatedCameraModal.css';

interface UnauthenticatedCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnauthenticatedCameraModal: React.FC<UnauthenticatedCameraModalProps> = ({
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photoCapture, setPhotoCapture] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initializeCamera = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);
      } catch (err: any) {
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please enable camera access in your browser settings.'
            : err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Failed to access camera. Please try again.'
        );
        setIsActive(false);
      }
    };

    initializeCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Error is handled by timeout below
      });
    }

    // Add timeout to detect if video stream doesn't start playing
    playTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && videoRef.current.paused) {
        setError('Camera stream initialized but video is not playing. Check your browser permissions.');
        setIsActive(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
    }, 2000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    setCapturing(true);

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) {
        return;
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setPhotoCapture(imageData);
      setCapturing(false);
    } catch (err) {
      setError('Failed to capture photo');
      setCapturing(false);
    }
  };

  const sharePhoto = async () => {
    if (!photoCapture) {
      return;
    }

    try {
      // Convert data URL to blob
      const response = await fetch(photoCapture);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Try Web Share API if available
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Photo from Lens Flare',
        });
      } else {
        // Fallback to download
        downloadPhoto();
      }

      resetCapture();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // User cancelled share, that's ok
        setError('Failed to share photo');
      }
    }
  };

  const downloadPhoto = () => {
    if (!photoCapture) {
      return;
    }

    const link = document.createElement('a');
    link.href = photoCapture;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    resetCapture();
  };

  const resetCapture = () => {
    setPhotoCapture(null);
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
    setIsActive(false);
    setError(null);
    setPhotoCapture(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="unauth-camera-modal-overlay" onClick={handleClose}>
      <div className="unauth-camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="unauth-camera-modal-close"
          onClick={handleClose}
          aria-label="Close camera"
        >
          ✕
        </button>

        <h2 className="unauth-camera-modal-title">Take a Photo</h2>

        {error && <div className="unauth-camera-modal-error">{error}</div>}

        {!photoCapture ? (
          <div className="unauth-camera-modal-camera">
            <div className="unauth-camera-preview">
              {isActive ? (
                <>
                  <video
                    ref={videoRef}
                    onLoadedMetadata={handleLoadedMetadata}
                    autoPlay
                    playsInline
                    className="unauth-camera-video"
                  />
                </>
              ) : (
                <div className="unauth-camera-placeholder">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="23 19 23 4 1 4 1 19 23 19" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </div>
              )}
            </div>

            {isActive && (
              <Button
                onClick={capturePhoto}
                size="lg"
                isLoading={capturing}
                className="unauth-camera-capture-button"
              >
                Capture Photo
              </Button>
            )}
          </div>
        ) : (
          <div className="unauth-camera-modal-preview">
            <img src={photoCapture} alt="Captured photo" className="unauth-camera-captured-image" />

            <div className="unauth-camera-actions">
              <Button onClick={resetCapture} variant="secondary">
                Retake
              </Button>

              {!!navigator?.share ? (
                <Button onClick={sharePhoto}>Share</Button>
              ) : (
                <Button onClick={downloadPhoto}>Download</Button>
              )}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="unauth-camera-hidden-canvas" />
      </div>
    </div>
  );
};
