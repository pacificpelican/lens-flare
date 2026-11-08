import React, { useEffect, useRef, useState } from 'react';
import './CameraModal.css';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let playTimeout: NodeJS.Timeout | null = null;

    const initCamera = async () => {
      try {
        setError(null);
        
        // Try with ideal constraints first (for mobile), fallback to simpler constraints
        let stream: MediaStream | undefined;
        
        try {
          // Primary: Try to get ideal resolution camera (works for mobile rear camera)
          const constraints = {
            video: { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 }, 
              height: { ideal: 1080} 
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (primaryError) {
          // Fallback: Try front-facing camera with basic constraints (works for laptop webcam)
          const fallbackConstraints = {
            video: { 
              facingMode: 'user',
              width: { max: 1920 },
              height: { max: 1080 }
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Handle video element errors
          videoRef.current.onerror = () => {
            setError('Failed to display video stream. Please try again or check your camera.');
            setIsCameraReady(false);
          };

          videoRef.current.onloadedmetadata = () => {
            // Make sure video has dimensions before marking as ready
            if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              setIsCameraReady(true);
              
              // Add a timeout to detect if video never actually plays
              playTimeout = setTimeout(() => {
                if (videoRef.current && videoRef.current.paused) {
                  setError('Camera stream initialized but video is not playing. Check your browser permissions.');
                  setIsCameraReady(false);
                }
              }, 2000);
            } else {
              setError('Camera stream loaded but no valid video data received.');
              setIsCameraReady(false);
            }
          };
        }
      } catch (err) {
        const error = err as Error;
        if (error.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setError('No camera device found. Please check your hardware.');
        } else if (error.name === 'NotSupportedError') {
          setError('Camera is not supported on this device or browser.');
        } else if (error.name === 'OverconstrainedError') {
          setError('Camera does not meet the required specifications. Please check your camera settings.');
        } else {
          setError(`Failed to access camera: ${error.message}`);
        }
        setIsCameraReady(false);
      }
    };

    initCamera();

    return () => {
      if (playTimeout) {
        clearTimeout(playTimeout);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          handleClose();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay">
      <div className="camera-modal">
        <div className="camera-modal-header">
          <h2>Take a Photo</h2>
          <button className="camera-close-btn" onClick={handleClose} title="Close camera">
            ✕
          </button>
        </div>

        <div className="camera-modal-content">
          {error ? (
            <div className="camera-error">
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview"
                style={{ display: isCameraReady ? 'block' : 'none' }}
              />
              {!isCameraReady && (
                <div className="camera-loading">
                  <p>Initializing camera...</p>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          )}
        </div>

        {isCameraReady && !error && (
          <div className="camera-modal-footer">
            <button className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCapture}>
              📸 Capture Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
