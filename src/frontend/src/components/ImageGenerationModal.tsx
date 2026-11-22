import React, { useEffect, useRef, useState } from 'react';
import { Photo } from '@shared/types';
import { MAX_GENERATION_PROMPT_LENGTH } from '@shared/image-generation';
import apiClient from '../services/api';
import './ImageGenerationModal.css';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (photo: Photo) => void;
}

const STATUS_MESSAGES = [
  'Warming up the model...',
  'Sketching the composition...',
  'Adding light and colour...',
  'Refining the details...',
  'Almost there...',
];

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setIsGenerating(true);

    try {
      const response = await apiClient.post<{ data: Photo }>(
        '/api/photos/generate',
        { prompt: trimmed },
        { signal: controller.signal }
      );
      setPrompt('');
      onGenerated(response.data);
      onClose();
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setError(err?.response?.data?.error || 'Image generation failed. Please try again.');
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setError(null);
    onClose();
  };

  const statusMessage = STATUS_MESSAGES[Math.min(Math.floor(elapsed / 8), STATUS_MESSAGES.length - 1)];

  return (
    <div className="imagegen-overlay" onClick={handleClose}>
      <div
        className="imagegen-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="imagegen-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="imagegen-header">
          <h2 id="imagegen-title">Generate an Image</h2>
          <button className="imagegen-close-btn" onClick={handleClose} title="Close" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleGenerate}>
          <div className="imagegen-body">
            {isGenerating ? (
              <div className="imagegen-progress" role="status" aria-live="polite">
                <div className="imagegen-canvas">
                  <div className="imagegen-pulse" />
                  <div className="imagegen-pulse imagegen-pulse-delayed" />
                  <div className="imagegen-sparkle" />
                </div>
                <p className="imagegen-status">{statusMessage}</p>
                <p className="imagegen-elapsed">{elapsed}s</p>
                <p className="imagegen-prompt-echo">“{prompt.trim()}”</p>
              </div>
            ) : (
              <>
                <label htmlFor="imagegen-prompt" className="imagegen-label">
                  Describe the image you want
                </label>
                <textarea
                  id="imagegen-prompt"
                  className="imagegen-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={MAX_GENERATION_PROMPT_LENGTH}
                  rows={5}
                  placeholder="A lighthouse on a rocky coast at sunrise, soft morning haze, 35mm film"
                  autoFocus
                />
              </>
            )}
            {error && <p className="imagegen-error" role="alert">{error}</p>}
          </div>

          <div className="imagegen-footer">
            <button type="button" className="imagegen-btn imagegen-btn-secondary" onClick={handleClose}>
              {isGenerating ? 'Cancel' : 'Close'}
            </button>
            {!isGenerating && (
              <button type="submit" className="imagegen-btn imagegen-btn-primary" disabled={!prompt.trim()}>
                Generate
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
