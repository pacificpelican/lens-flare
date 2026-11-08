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
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        console.log('Camera stream received:', stream);
        console.log('Video tracks:', stream.getVideoTracks());
        
        streamRef.current = stream;
        
        // Wait for video element to be available, with retries
        let retries = 0;
        const attachStream = () => {
          if (videoRef.current) {
            console.log('Attaching stream to video element');
            videoRef.current.srcObject = stream;
            console.log('Video element srcObject set');
            setIsActive(true);
          } else if (retries < 5) {
            retries++;
            console.log('Waiting for video ref... retry', retries);
            setTimeout(attachStream, 100);
          } else {
            console.error('videoRef.current is null after retries');
            setError('Failed to initialize camera - video element not ready');
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        };
        
        attachStream();
      } catch (err: any) {
        console.error('Camera initialization error:', err);
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
      // Attempt to play the video
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error('Video play error:', err);
          setError('Unable to play camera stream. Check browser permissions.');
        });
      }
    }

    // Add timeout to detect if video stream doesn't start playing
    playTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        // Check if video has content
        if (videoRef.current.paused || videoRef.current.videoWidth === 0) {
          console.error('Video not playing or has no width. paused:', videoRef.current.paused, 'width:', videoRef.current.videoWidth);
          setError('Camera stream initialized but video is not playing. Check your browser permissions.');
          setIsActive(false);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
        }
      }
    }, 2000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera reference not available');
      return;
    }

    setCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        setError('Failed to get canvas context');
        setCapturing(false);
        return;
      }

      // Ensure video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Video stream not ready. Please wait a moment and try again.');
        setCapturing(false);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to JPEG data URL
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Verify we got valid image data
      if (!imageData || imageData.length < 100) {
        setError('Failed to capture photo - image data invalid');
        setCapturing(false);
        return;
      }

      setPhotoCapture(imageData);
      setCapturing(false);
    } catch (err) {
      console.error('Photo capture error:', err);
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
              <video
                ref={videoRef}
                onLoadedMetadata={handleLoadedMetadata}
                autoPlay
                playsInline
                muted
                className="unauth-camera-video"
                style={{ display: isActive ? 'block' : 'none' }}
              />
              {!isActive && (
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
