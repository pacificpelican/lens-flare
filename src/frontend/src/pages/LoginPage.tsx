import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import apiClient from '../services/api';
import './LoginPage.css';

interface RegistrationConfig {
  allowOpenSignups: boolean;
  requiresInviteCode: boolean;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isLoading, error, clearError, emailEnabled } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(() => 
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [regConfig, setRegConfig] = useState<RegistrationConfig>({ allowOpenSignups: true, requiresInviteCode: false });
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    if (mode === 'register') {
      fetchRegistrationConfig();
    }
  }, [mode]);

  const fetchRegistrationConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await apiClient.get<{ data: RegistrationConfig }>('/api/auth/config');
      setRegConfig(response.data);
    } catch (err) {
      console.error('Failed to fetch registration config:', err);
      setRegConfig({ allowOpenSignups: true, requiresInviteCode: false });
    } finally {
      setConfigLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
    setRememberMe(false);
    setLocalError(null);
    clearError();
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLocalError(null);
    clearError();
    setPassword('');
    setConfirmPassword('');
    // Update URL without full navigation
    const newParams = new URLSearchParams();
    if (newMode === 'register') {
      newParams.set('mode', 'register');
    }
    window.history.replaceState({}, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
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

    if (!regConfig.allowOpenSignups && regConfig.requiresInviteCode && !inviteCode) {
      setLocalError('Invite code is required');
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
      await register({ email, password, username: username || undefined, inviteCode: inviteCode || undefined });
      resetForm();
      navigate('/gallery');
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Link to="/" className="login-logo-link">
          <h1 className="login-title">Lens Flare</h1>
        </Link>
        <p className="login-subtitle">
          {mode === 'login' ? 'Photo Archiver' : 'Create Your Account'}
        </p>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            {(error || localError) && (
              <div className="login-error">{error || localError}</div>
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

            <div className="login-checkbox">
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

            {emailEnabled && (
              <Link to="/forgot-password" className="login-forgot-password">
                Forgot password?
              </Link>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            {(error || localError) && (
              <div className="login-error">{error || localError}</div>
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

            {!regConfig.allowOpenSignups && regConfig.requiresInviteCode && (
              <Input
                type="text"
                label="Invite Code"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={isLoading}
                helperText="Required to create an account"
              />
            )}

            <Button type="submit" size="md" isLoading={isLoading || configLoading}>
              Create Account
            </Button>
          </form>
        )}

        <p className="login-footer">
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            type="button"
            className="login-link"
            onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};
