import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, LoginRequest, RegisterRequest } from '@shared/types';
import apiClient from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  register: (data: RegisterRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      // Create a promise that resolves when the auth check completes or times out
      const authPromise = token 
        ? apiClient.getCurrentUser()
          .then(user => isMounted && setUser(user))
          .catch(err => {
            if (isMounted) {
              localStorage.removeItem('access_token');
              setUser(null);
            }
          })
        : Promise.resolve();

      // Set a timeout to force completion after 10 seconds
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10000));
      
      await Promise.race([authPromise, timeoutPromise]);
      
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  const register = async (data: RegisterRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiClient.register(data);
      setUser(response.user);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiClient.login(data);
      setUser(response.user);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await apiClient.logout();
      setUser(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Logout failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const deleteAccount = async (password: string) => {
    await apiClient.deleteAccount(password);
    setUser(null);
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    register,
    login,
    logout,
    deleteAccount,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
