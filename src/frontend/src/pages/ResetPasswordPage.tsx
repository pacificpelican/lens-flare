import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Button } from '../components/Button';
import './ResetPasswordPage.css';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError('No reset token provided');
      setIsValidating(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/auth/validate-reset-token', { token });
      if (response.valid) {
        setIsValid(true);
      } else {
        setError(response.message || 'Invalid or expired reset token');
      }
    } catch (err) {
      setError('Failed to validate reset token');
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setError(null);

    if (!newPassword) {
      setPasswordError('Password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/auth/reset-password', {
        token,
        newPassword,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <p>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <h1>Invalid Reset Link</h1>
            <p className="reset-password-error-text">{error || 'This reset link is invalid or has expired.'}</p>
            <Button onClick={() => navigate('/forgot-password')} className="reset-password-button">
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <h1>Password Reset Successful</h1>
            <p>Your password has been reset. Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h1>Set New Password</h1>
          <p>Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="reset-password-form">
            {error && <div className="reset-password-error">{error}</div>}
            {passwordError && <div className="reset-password-error">{passwordError}</div>}

            <div className="reset-password-field">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="reset-password-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="reset-password-submit"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="reset-password-cancel"
            >
              Back to Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
