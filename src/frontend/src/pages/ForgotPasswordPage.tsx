import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Button } from '../components/Button';
import './ForgotPasswordPage.css';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (response.success) {
        setSubmitted(true);
        setEmail('');
      }
    } catch (err) {
      setError('Failed to process password reset request');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <div className="forgot-password-card">
            <h1>Check Your Email</h1>
            <p className="forgot-password-message">
              If an account exists for the email address you provided, a password reset link has been sent.
            </p>
            <p className="forgot-password-subtext">
              The link will expire in 24 hours.
            </p>
            <Button onClick={() => navigate('/login')} className="forgot-password-button">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <h1>Forgot Password</h1>
          <p>Enter your email address and we'll send you a link to reset your password.</p>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            {error && <div className="forgot-password-error">{error}</div>}

            <div className="forgot-password-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="forgot-password-submit"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="forgot-password-cancel"
            >
              Back to Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
