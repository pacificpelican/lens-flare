import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { Input } from './Input';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setLocalError(null);
    clearError();
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLocalError(null);
    clearError();
    // Clear sensitive fields when switching modes
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    try {
      await login({ email, password });
      resetForm();
      onClose();
      navigate('/gallery');
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password || !confirmPassword) {
      setLocalError('Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({ email, password, username: username || undefined });
      resetForm();
      onClose();
      navigate('/gallery');
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Registration failed');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={handleClose} aria-label="Close modal">
          ✕
        </button>

        <div className="login-modal-header">
          <h2 className="login-modal-title">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="login-modal-subtitle">Lens Flare</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
            {(error || localError) && (
              <div className="login-modal-error">{error || localError}</div>
            )}

            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <div className="login-modal-checkbox">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>

            <Button type="submit" size="md" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-modal-form">
            {(error || localError) && (
              <div className="login-modal-error">{error || localError}</div>
            )}

            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Input
              type="text"
              label="Username (optional)"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              helperText="At least 8 characters"
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button type="submit" size="md" isLoading={isLoading}>
              Create Account
            </Button>
          </form>
        )}

        <div className="login-modal-footer">
          <p className="login-modal-footer-text">
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              type="button"
              className="login-modal-switch"
              onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
