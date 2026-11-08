import React, { useState } from 'react';
import { LoginModal } from '../components/LoginModal';
import { UnauthenticatedCameraModal } from '../components/UnauthenticatedCameraModal';
import { Button } from '../components/Button';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-content">
          <div className="landing-nav-logo">
            <img src="/images/lens-flare-logo.png" alt="Lens Flare" className="landing-logo-image" />
            <span className="landing-logo-text">Lens Flare</span>
          </div>

          <div className="landing-nav-actions">
            <Button
              onClick={() => setIsCameraModalOpen(true)}
              variant="secondary"
              size="sm"
              className="landing-nav-camera-btn"
              title="Open camera without signing in"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="23 19 23 4 1 4 1 19 23 19" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
              Camera
            </Button>

            <Button
              onClick={() => setIsLoginModalOpen(true)}
              size="sm"
              className="landing-nav-login-btn"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-logo">
            <img src="/images/lens-flare-logo.png" alt="Lens Flare Logo" />
          </div>

          <h1 className="landing-hero-title">Lens Flare</h1>
          <p className="landing-hero-subtitle">Your Digital Photo Archive</p>

          <p className="landing-hero-description">
            A modern, intuitive photo archiver for organizing, editing, and managing your digital photo
            collection. Built for photographers who care about quality, organization, and control.
          </p>

          <Button
            onClick={() => setIsLoginModalOpen(true)}
            size="lg"
            className="landing-hero-cta"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <h2 className="landing-features-title">Features</h2>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2z" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </div>
            <h3>Organize Photos</h3>
            <p>Browse your photo collection in a beautiful contact sheet with sorting and filtering options.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>AI Descriptions</h3>
            <p>Get intelligent, automated descriptions of your photos powered by AI image analysis.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <polyline points="16 7 12 11 8 7" />
              </svg>
            </div>
            <h3>Export Formats</h3>
            <p>Export your photos in multiple formats: JPEG, PNG, WebP, AVIF, and original raw formats.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
            </div>
            <h3>EXIF Metadata</h3>
            <p>View detailed EXIF data from your photos including camera settings, date, and location.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h3>Image Editing</h3>
            <p>Crop, rotate, adjust colors, and apply filters to your photos with an intuitive editor.</p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <path d="M12 1v6m0 6v6" />
                <path d="M4.22 4.22l4.24 4.24m4.24-4.24l4.24 4.24" />
                <path d="M1 12h6m6 0h6" />
                <path d="M4.22 19.78l4.24-4.24m4.24 4.24l4.24-4.24" />
                <path d="M19.78 4.22l-4.24 4.24m4.24 4.24l-4.24 4.24" />
              </svg>
            </div>
            <h3>Tags & Descriptions</h3>
            <p>Add custom tags and descriptions to organize and quickly find your photos.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <h2 className="landing-how-title">How It Works</h2>

        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">1</div>
            <h3>Sign Up</h3>
            <p>Create a free account with your email and password.</p>
          </div>

          <div className="landing-step">
            <div className="landing-step-number">2</div>
            <h3>Upload Photos</h3>
            <p>Upload photos from your device or take photos directly with your camera.</p>
          </div>

          <div className="landing-step">
            <div className="landing-step-number">3</div>
            <h3>Organize</h3>
            <p>View your photos in a beautiful gallery, add tags and descriptions.</p>
          </div>

          <div className="landing-step">
            <div className="landing-step-number">4</div>
            <h3>Export</h3>
            <p>Edit and export your photos in any format you need.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-section">
            <h4>About</h4>
            <p>
              Lens Flare is a modern photo archiver built for photographers who want control over their
              digital archive.
            </p>
            <div className="landing-footer-links">
              <a
                href="https://github.com/pacificpelican/lens-flare"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link"
              >
                GitHub
              </a>
            </div>
          </div>

          <div className="landing-footer-section">
            <h4>Quick Links</h4>
            <ul className="landing-footer-nav">
              <li>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="landing-footer-button"
                >
                  Sign In
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className="landing-footer-button"
                >
                  Camera
                </button>
              </li>
            </ul>
          </div>

          <div className="landing-footer-section">
            <h4>Credits</h4>
            <p>
              Created by{' '}
              <a href="https://danieljmckeown.com" target="_blank" rel="noopener noreferrer">
                Daniel McKeown
              </a>
            </p>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>
            Powered by{' '}
            <a href="https://github.com/pacificpelican/lens-flare" target="_blank" rel="noopener noreferrer">
              Lens Flare
            </a>
          </p>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <UnauthenticatedCameraModal isOpen={isCameraModalOpen} onClose={() => setIsCameraModalOpen(false)} />
    </div>
  );
};
